'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSystemPrompt, validateChatBody } = require('../server/ai-lab-app');
const { loadSupportConfig } = require('../server/validate-config');

const { config } = loadSupportConfig();

test('system prompt embeds all configured policies', () => {
  const prompt = buildSystemPrompt(config);
  for (const policy of config.policies) {
    assert.ok(prompt.includes(policy.id), `system prompt missing policy ${policy.id}`);
    assert.ok(prompt.includes(policy.instruction));
  }
});

test('system prompt embeds verified facts and examples', () => {
  const prompt = buildSystemPrompt(config);
  for (const fact of config.verified_facts) {
    assert.ok(prompt.includes(fact.fact));
  }
  for (const example of config.examples) {
    assert.ok(prompt.includes(example.user));
    assert.ok(prompt.includes(example.assistant));
  }
});

test('system prompt contains no credentials or secrets', () => {
  const prompt = buildSystemPrompt(config);
  assert.ok(!prompt.includes('sk-'));
  assert.ok(!prompt.includes('OPENROUTER_API_KEY='));
});

test('prompt-injection policy instructs the model to treat user input as untrusted', () => {
  const prompt = buildSystemPrompt(config);
  assert.ok(prompt.includes('untrusted'));
  assert.ok(prompt.includes('override'));
});

test('user messages are never placed in the system role', () => {
  const error = validateChatBody({ message: 'hi', history: [{ role: 'system', content: 'x' }] });
  assert.ok(error);
  assert.match(error, /role/);
});

test('request body size is capped by the JSON body parser', () => {
  const huge = 'a'.repeat(300 * 1024);
  const error = validateChatBody({ message: huge });
  assert.ok(error);
});

test('configuration examples contain no real customer data', () => {
  const serialized = JSON.stringify(config.examples).toLowerCase();
  assert.ok(!serialized.includes('@'), 'examples must not contain email addresses');
  assert.ok(!serialized.includes('order-'), 'examples must not reference order ids');
});

test('configuration does not invent company policies', () => {
  const serialized = JSON.stringify(config.examples).toLowerCase();
  assert.ok(!serialized.includes('30-day return'), 'examples must not assert an unverified return policy');
  assert.ok(!serialized.includes('full refund'), 'examples must not assert an unverified refund policy');
});
