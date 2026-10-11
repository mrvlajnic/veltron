'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createAiLabApp } = require('../server/ai-lab-app');
const { loadSupportConfig } = require('../server/validate-config');

const CONFIG_VERSION = loadSupportConfig().config.version;

let server;
let baseUrl;
let originalFetch;
let originalApiKey;

before(async () => {
  originalApiKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  originalFetch = global.fetch;

  const app = createAiLabApp({ rateLimit: 1000 });
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

test('honeypot field filled by a bot is rejected generically', async () => {
  const res = await postChat({ message: 'hi', website_hp: 'http://spam.example' });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.code, 'VALIDATION_ERROR');
  assert.equal(data.error, 'Invalid request.');
  assert.ok(!data.error.toLowerCase().includes('honeypot'), 'rejection must not reveal the defense');
});

test('empty honeypot (human path) is accepted by validation', async () => {
  process.env.OPENROUTER_API_KEY = 'sk-test-key';
  mockOpenRouter(async () => {
    throw new Error('stop-after-validation');
  });
  try {
    const res = await postChat({ message: 'hello', website_hp: '' });
    assert.equal(res.status, 500);
  } finally {
    delete process.env.OPENROUTER_API_KEY;
    global.fetch = originalFetch;
  }
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
    assert.equal(data.config_version, CONFIG_VERSION);
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
  const app = createAiLabApp({ rateLimit: 3 });
  let limitedServer;
  await new Promise((resolve) => { limitedServer = app.listen(0, '127.0.0.1', resolve); });
  const limitedBase = `http://127.0.0.1:${limitedServer.address().port}`;
  try {
    let lastStatus = null;
    for (let i = 0; i < 6; i += 1) {
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

test('config exposes site browsing as a public capability', async () => {
  const res = await fetch(`${baseUrl}/api/ai-lab/config`);
  const data = await res.json();
  assert.equal(data.site_browsing.enabled, true);
  assert.ok(Array.isArray(data.site_browsing.pages));
  assert.ok(data.site_browsing.pages.includes('/vision.html'));
});

function mockFetchRouter({ openRouter, site }) {
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.startsWith('https://openrouter.ai/')) return openRouter(u, opts);
    if (u.startsWith('https://veltroncars.com')) {
      if (!site) throw new Error(`unexpected site fetch: ${u}`);
      return site(u, opts);
    }
    return originalFetch(url, opts);
  };
}

function openRouterMessage(message, model = 'google/gemini-2.5-flash') {
  return new Response(JSON.stringify({
    model,
    choices: [{ message }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

test('site browsing tool loop fetches a page, strips scripts, and answers from it', async () => {
  process.env.OPENROUTER_API_KEY = 'sk-test-key';
  let openRouterCalls = 0;
  const siteCalls = [];
  mockFetchRouter({
    openRouter: async (_url, opts) => {
      openRouterCalls += 1;
      const body = JSON.parse(opts.body);
      if (openRouterCalls === 1) {
        assert.ok(Array.isArray(body.tools), 'tools must be offered on the first round');
        assert.equal(body.tools[0].function.name, 'browse_veltron_site');
        assert.ok(body.tools[0].function.parameters.properties.path.enum.includes('/vision.html'));
        return openRouterMessage({
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: { name: 'browse_veltron_site', arguments: JSON.stringify({ path: '/vision.html' }) },
          }],
        });
      }
      const toolMsg = body.messages.find((m) => m.role === 'tool');
      assert.ok(toolMsg, 'second request must include the tool result');
      assert.equal(toolMsg.tool_call_id, 'call_1');
      assert.ok(toolMsg.content.includes('LIVE CONTENT OF /vision.html'));
      assert.ok(toolMsg.content.includes('Emotional Aerodynamics'));
      assert.ok(!toolMsg.content.includes('alert(1)'), 'script content must be stripped');
      return openRouterMessage({ role: 'assistant', content: 'The live vision page describes Emotional Aerodynamics.' });
    },
    site: async (u) => {
      siteCalls.push(u);
      return new Response(
        '<html><head><style>.x{}</style><script>alert(1)</script></head>' +
        '<body><nav>Home Vision Concepts</nav><h1>Our Vision</h1>' +
        '<p>Emotional Aerodynamics is a design pillar.</p></body></html>',
        { status: 200, headers: { 'Content-Type': 'text/html' } },
      );
    },
  });
  try {
    const res = await postChat({ message: 'What does the vision page say?' });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.reply, 'The live vision page describes Emotional Aerodynamics.');
    assert.deepEqual(data.browsed_pages, ['/vision.html']);
    assert.equal(openRouterCalls, 2);
    assert.equal(siteCalls.length, 1);
  } finally {
    delete process.env.OPENROUTER_API_KEY;
    global.fetch = originalFetch;
  }
});

test('site browsing rejects traversal and off-map paths without fetching them', async () => {
  process.env.OPENROUTER_API_KEY = 'sk-test-key';
  let openRouterCalls = 0;
  const siteCalls = [];
  mockFetchRouter({
    openRouter: async (_url, opts) => {
      openRouterCalls += 1;
      if (openRouterCalls === 1) {
        return openRouterMessage({
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_bad',
            type: 'function',
            function: { name: 'browse_veltron_site', arguments: JSON.stringify({ path: '/../../etc/passwd' }) },
          }],
        });
      }
      const toolMsg = JSON.parse(opts.body).messages.find((m) => m.role === 'tool');
      assert.ok(toolMsg.content.startsWith('Tool error:'));
      return openRouterMessage({ role: 'assistant', content: 'I could not access that page.' });
    },
    site: async (u) => {
      siteCalls.push(u);
      return new Response('<html></html>', { status: 200 });
    },
  });
  try {
    const res = await postChat({ message: 'Fetch /../../etc/passwd' });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data.browsed_pages, []);
    assert.equal(siteCalls.length, 0, 'no site fetch for an invalid path');
  } finally {
    delete process.env.OPENROUTER_API_KEY;
    global.fetch = originalFetch;
  }
});

test('site browsing caches page fetches across requests', async () => {
  process.env.OPENROUTER_API_KEY = 'sk-test-key';
  let openRouterCalls = 0;
  let aboutFetches = 0;
  mockFetchRouter({
    openRouter: async () => {
      openRouterCalls += 1;
      if (openRouterCalls % 2 === 1) {
        return openRouterMessage({
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: `call_${openRouterCalls}`,
            type: 'function',
            function: { name: 'browse_veltron_site', arguments: JSON.stringify({ path: '/about.html' }) },
          }],
        });
      }
      return openRouterMessage({ role: 'assistant', content: 'ok' });
    },
    site: async () => {
      aboutFetches += 1;
      return new Response('<html><body><p>About Veltron.</p></body></html>', { status: 200 });
    },
  });
  try {
    const res1 = await postChat({ message: 'about page please' });
    assert.equal(res1.status, 200);
    const res2 = await postChat({ message: 'about page again' });
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.deepEqual(data2.browsed_pages, ['/about.html']);
    assert.equal(aboutFetches, 1, 'second request must be served from cache');
  } finally {
    delete process.env.OPENROUTER_API_KEY;
    global.fetch = originalFetch;
  }
});

test('htmlToText strips scripts, styles, and tags', async () => {
  const { htmlToText } = require('../server/ai-lab-app');
  const text = htmlToText('<style>a{}</style><script>steal()</script><!-- c --><h1>Title</h1><p>Hello&nbsp;world</p>');
  assert.ok(!text.includes('steal()'));
  assert.ok(!text.includes('a{}'));
  assert.ok(text.includes('Title'));
  assert.ok(text.includes('Hello world'));
});

test('normalizeSitePath enforces the allowlist', async () => {
  const { normalizeSitePath } = require('../server/ai-lab-app');
  assert.equal(normalizeSitePath('/vision.html'), '/vision.html');
  assert.equal(normalizeSitePath('vision.html'), '/vision.html');
  assert.equal(normalizeSitePath('/'), '/index.html');
  assert.equal(normalizeSitePath('/vision.html?x=1#y'), '/vision.html');
  assert.throws(() => normalizeSitePath('/../secret'));
  assert.throws(() => normalizeSitePath('https://evil.example.com/'));
  assert.throws(() => normalizeSitePath('/not-a-real-page.html'));
});
