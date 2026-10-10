'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateSupportConfig, loadSupportConfig } = require('../server/validate-config');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'support-assistant.json');

test('valid configuration loads from disk', () => {
  const result = loadSupportConfig(CONFIG_PATH);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.ok(result.config);
});

test('loaded configuration has name, version, and policies', () => {
  const result = loadSupportConfig(CONFIG_PATH);
  assert.equal(result.config.name, 'Veltron Support AI');
  assert.match(result.config.version, /^\d+\.\d+\.\d+$/);
  assert.ok(Array.isArray(result.config.policies));
  assert.ok(result.config.policies.length >= 5);
});

test('configuration version is a semantic version string', () => {
  const result = loadSupportConfig(CONFIG_PATH);
  assert.equal(typeof result.config.version, 'string');
  const [major, minor, patch] = result.config.version.split('.').map(Number);
  assert.ok(major >= 0 && minor >= 0 && patch >= 0);
});

test('required policy ids are present', () => {
  const result = loadSupportConfig(CONFIG_PATH);
  const ids = result.config.policies.map((p) => p.id);
  for (const required of ['truthfulness', 'uncertainty', 'escalation', 'scope', 'prompt-injection']) {
    assert.ok(ids.includes(required), `missing policy ${required}`);
  }
});

test('invalid JSON is rejected with a useful error', () => {
  const tmp = path.join(__dirname, 'tmp-invalid.json');
  fs.writeFileSync(tmp, '{ "name": "broken", ');
  try {
    const result = loadSupportConfig(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
    assert.match(result.errors[0], /Invalid JSON/);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('missing required fields are rejected', () => {
  const errors = validateSupportConfig({ name: 'x' });
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes('version')));
  assert.ok(errors.some((e) => e.includes('policies')));
});

test('non-semantic version is rejected', () => {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  raw.version = '1.0';
  const errors = validateSupportConfig(raw);
  assert.ok(errors.some((e) => e.includes('version')));
});

test('duplicate policy ids are rejected', () => {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  raw.policies.push({ id: 'truthfulness', instruction: 'duplicate of an existing policy id' });
  const errors = validateSupportConfig(raw);
  assert.ok(errors.some((e) => e.includes('duplicate')));
});

test('non-object configuration is rejected', () => {
  const errors = validateSupportConfig([1, 2, 3]);
  assert.ok(errors.length > 0);
});

test('examples require non-empty user and assistant text', () => {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  raw.examples.push({ id: 'bad', user: '', 'assistant': '' });
  const errors = validateSupportConfig(raw);
  assert.ok(errors.some((e) => e.includes('examples')));
});

test('missing required policy id is reported', () => {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  raw.policies = raw.policies.filter((p) => p.id !== 'escalation');
  const errors = validateSupportConfig(raw);
  assert.ok(errors.some((e) => e.includes('escalation')));
});
