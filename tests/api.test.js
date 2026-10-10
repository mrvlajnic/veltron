'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createAiLabApp } = require('../server/ai-lab-app');

let server;
let baseUrl;
let originalFetch;
let originalApiKey;

before(async () => {
  originalApiKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  originalFetch = global.fetch;

  const app = createAiLabApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  global.fetch = originalFetch;
  if (originalApiKey !== undefined) process.env.OPENROUTER_API_KEY = originalApiKey;
  await new Promise((resolve) => server.close(resolve));
});

async function postChat(body, headers = {}) {
  return fetch(`${baseUrl}/api/ai-lab/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function mockOpenRouter(handler) {
  global.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.startsWith('https://openrouter.ai/')) {
      return handler(url, opts);
    }
    return originalFetch(url, opts);
  };
}

test('GET /config returns public configuration without secrets', async () => {
  const res = await fetch(`${baseUrl}/api/ai-lab/config`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.name, 'Veltron Support AI');
  assert.match(data.version, /^\d+\.\d+\.\d+$/);
  assert.ok(Array.isArray(data.policies));
  assert.equal(data.configured, false);
  const serialized = JSON.stringify(data);
  assert.ok(!serialized.includes('sk-'), 'response must not contain API key material');
});

test('POST /chat without credentials returns a clear configuration error', async () => {
  const res = await postChat({ message: 'Hello' });
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.code, 'NOT_CONFIGURED');
  assert.match(data.error, /OPENROUTER_API_KEY/);
  assert.ok(!data.error.includes('sk-'));
});

test('empty message is rejected', async () => {
  const res = await postChat({ message: '   ' });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.code, 'VALIDATION_ERROR');
});

test('non-string message is rejected', async () => {
  const res = await postChat({ message: 42 });
  assert.equal(res.status, 400);
});

test('excessively long message is rejected', async () => {
  const res = await postChat({ message: 'a'.repeat(2001) });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /2000/);
});

test('message at the length limit is accepted by validation', async () => {
  process.env.OPENROUTER_API_KEY = 'sk-test-key';
  mockOpenRouter(async () => {
    throw new Error('stop-after-validation');
  });
  try {
    const res = await postChat({ message: 'a'.repeat(2000) });
    assert.equal(res.status, 500);
  } finally {
    delete process.env.OPENROUTER_API_KEY;
    global.fetch = originalFetch;
  }
});

test('oversized history is rejected', async () => {
  const history = Array.from({ length: 21 }, (_, i) => ({ role: 'user', content: `m${i}` }));
  const res = await postChat({ message: 'hi', history });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /20/);
});

test('history with invalid role is rejected', async () => {
  const res = await postChat({ message: 'hi', history: [{ role: 'system', content: 'x' }] });
  assert.equal(res.status, 400);
});

test('malformed JSON body is rejected by body parser', async () => {
  const res = await fetch(`${baseUrl}/api/ai-lab/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ not json',
  });
  assert.equal(res.status, 400);
});

test('arbitrary model identifiers are not honored', async () => {
  process.env.OPENROUTER_API_KEY = 'sk-test-key';
  let capturedModel = null;
  mockOpenRouter(async (url, opts) => {
    const body = JSON.parse(opts.body);
    capturedModel = body.model;
    return new Response(JSON.stringify({
      model: 'fake/model',
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  try {
    const res = await postChat({ message: 'hi', model: 'evil/arbitrary-model' });
    assert.equal(res.status, 200);
    assert.notEqual(capturedModel, 'evil/arbitrary-model');
  } finally {
    delete process.env.OPENROUTER_API_KEY;
    global.fetch = originalFetch;
  }
});

test('valid request reaches the provider and returns the model identifier', async () => {
  process.env.OPENROUTER_API_KEY = 'sk-test-key';
  mockOpenRouter(async (url, opts) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    const headers = opts.headers;
    assert.equal(headers.Authorization, 'Bearer sk-test-key');
    assert.ok(!JSON.stringify(headers).includes('undefined'));
    const body = JSON.parse(opts.body);
    assert.equal(body.model, 'openrouter/auto');
    assert.ok(Array.isArray(body.messages));
    assert.equal(body.messages[0].role, 'system');
    return new Response(JSON.stringify({
      id: 'gen-1',
      model: 'some-provider/some-model',
      choices: [{ message: { role: 'assistant', content: 'Hello from the model.' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  try {
    const res = await postChat({ message: 'Hello', history: [{ role: 'user', content: 'earlier' }] });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.reply, 'Hello from the model.');
    assert.equal(data.model, 'some-provider/some-model');
    assert.equal(data.config_version, '1.0.0');
    assert.equal(data.usage.total_tokens, 15);
  } finally {
    delete process.env.OPENROUTER_API_KEY;
    global.fetch = originalFetch;
  }
});

test('provider HTTP error is handled safely without leaking internals', async () => {
  process.env.OPENROUTER_API_KEY = 'sk-test-key';
  mockOpenRouter(async () => new Response(JSON.stringify({
    error: { message: 'internal provider detail sk-leak-check' },
  }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
  try {
    const res = await postChat({ message: 'hi' });
    assert.equal(res.status, 502);
    const data = await res.json();
    assert.equal(data.code, 'PROVIDER_ERROR');
    assert.ok(!JSON.stringify(data).includes('sk-leak-check'), 'provider internals must not leak');
  } finally {
    delete process.env.OPENROUTER_API_KEY;
    global.fetch = originalFetch;
  }
});

test('provider timeout is handled', async () => {
  process.env.OPENROUTER_API_KEY = 'sk-test-key';
  mockOpenRouter(async (_url, opts) => {
    return new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  });
  try {
    const res = await postChat({ message: 'hi' });
    assert.equal(res.status, 504);
    const data = await res.json();
    assert.equal(data.code, 'TIMEOUT');
  } finally {
    delete process.env.OPENROUTER_API_KEY;
    global.fetch = originalFetch;
  }
});

test('rate limiting returns 429 after the limit is exceeded', async () => {
  const app = createAiLabApp();
  let limitedServer;
  await new Promise((resolve) => { limitedServer = app.listen(0, '127.0.0.1', resolve); });
  const limitedBase = `http://127.0.0.1:${limitedServer.address().port}`;
  try {
    let lastStatus = null;
    for (let i = 0; i < 25; i += 1) {
      const res = await fetch(`${limitedBase}/api/ai-lab/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'hi' }),
      });
      lastStatus = res.status;
      if (res.status === 429) break;
    }
    assert.equal(lastStatus, 429);
  } finally {
    await new Promise((resolve) => limitedServer.close(resolve));
  }
});

test('security headers are present on responses', async () => {
  const res = await fetch(`${baseUrl}/api/ai-lab/config`);
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(res.headers.get('Referrer-Policy'), 'no-referrer');
});

test('CORS allows the production origin and rejects unknown origins', async () => {
  const res = await fetch(`${baseUrl}/api/ai-lab/config`, { headers: { Origin: 'https://veltroncars.com' } });
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://veltroncars.com');

  const res2 = await fetch(`${baseUrl}/api/ai-lab/config`, { headers: { Origin: 'https://evil.example.com' } });
  assert.equal(res2.headers.get('Access-Control-Allow-Origin'), null);
});
