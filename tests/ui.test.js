'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'ai-lab', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'ai-lab', 'ai-lab.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'ai-lab', 'ai-lab.css'), 'utf8');

test('page contains all required sections', () => {
  for (const id of ['playground', 'methodology', 'experiments', 'technical']) {
    assert.ok(html.includes(`id="${id}"`), `missing section #${id}`);
  }
  assert.ok(html.includes('Veltron AI Lab'));
});

test('page reuses the site stylesheet and design tokens', () => {
  assert.ok(html.includes('../Assets/css/styles.css'));
  assert.ok(css.includes('--primary-red'));
  assert.ok(css.includes('--card-bg'));
});

test('chat interface has message log, input, send, and clear controls', () => {
  assert.ok(html.includes('id="chat-log"'));
  assert.ok(html.includes('id="chat-input"'));
  assert.ok(html.includes('id="chat-send"'));
  assert.ok(html.includes('id="chat-clear"'));
});

test('chat form includes a hidden honeypot field for bot trapping', () => {
  assert.ok(html.includes('name="website_hp"'));
  assert.ok(html.includes('display:none'));
});

test('sample questions are present and clickable', () => {
  const sampleCount = (html.match(/ai-lab-sample-btn/g) || []).length;
  assert.ok(sampleCount >= 4, 'expected at least 4 sample question buttons');
});

test('external-model notice is displayed', () => {
  assert.ok(html.includes('external AI model'));
  assert.ok(html.includes('may be inaccurate'));
});

test('client calls the server-side API endpoint, never OpenRouter directly', () => {
  assert.ok(js.includes('/api/ai-lab/chat'));
  assert.ok(!js.includes('openrouter.ai'), 'client must not call OpenRouter directly');
});

test('no API key material in client assets', () => {
  assert.ok(!js.includes('sk-'));
  assert.ok(!html.includes('sk-'));
  assert.ok(!js.includes('OPENROUTER_API_KEY'));
});

test('untrusted content is rendered with textContent, not innerHTML', () => {
  assert.ok(js.includes('textContent'));
  const innerHtmlCalls = js.match(/innerHTML\s*=(?!\s*'')/g) || [];
  assert.equal(innerHtmlCalls.length, 0, 'no innerHTML assignment with dynamic content is allowed');
});

test('Enter-to-send and Shift+Enter newline behavior is implemented', () => {
  assert.ok(js.includes("e.key === 'Enter'"));
  assert.ok(js.includes('e.shiftKey'));
});

test('all interactive states are handled in the client', () => {
  for (const code of ['RATE_LIMITED', 'NOT_CONFIGURED', 'PROVIDER_ERROR', 'TIMEOUT']) {
    assert.ok(js.includes(code), `client must handle ${code}`);
  }
});

test('model identity returned by the API is displayed', () => {
  assert.ok(js.includes('data.model'));
  assert.ok(html.includes('id="model-label"'));
});

test('configuration is fetched and rendered in the code viewer', () => {
  assert.ok(js.includes('/api/ai-lab/config'));
  assert.ok(html.includes('id="config-viewer"'));
});

test('responsive and accessibility basics are present', () => {
  assert.ok(html.includes('aria-live'));
  assert.ok(html.includes('aria-label'));
  assert.ok(html.includes('role="status"'));
  assert.ok(css.includes('@media (max-width: 720px)'));
  assert.ok(html.includes('maxlength="2000"'));
});

// --- Site-wide chat widget ---

const widgetJs = fs.readFileSync(path.join(ROOT, 'Assets', 'js', 'ai-chat-widget.js'), 'utf8');
const widgetCss = fs.readFileSync(path.join(ROOT, 'Assets', 'css', 'ai-chat-widget.css'), 'utf8');

const WIDGET_PAGES = [
  'index.html', 'vision.html', 'concepts.html', 'concept-v1-sportline.html',
  'construction.html', 'journal.html', 'about.html', 'contact.html',
];

test('widget is included on all public pages', () => {
  for (const page of WIDGET_PAGES) {
    const content = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.ok(content.includes('Assets/css/ai-chat-widget.css'), `${page} missing widget CSS`);
    assert.ok(content.includes('Assets/js/ai-chat-widget.js'), `${page} missing widget script`);
  }
});

test('widget is not included on the AI Lab playground page', () => {
  assert.ok(!html.includes('ai-chat-widget.js'), 'ai-lab page has the full playground; widget must not double up');
});

test('widget calls the server API, never OpenRouter, and has no key material', () => {
  assert.ok(widgetJs.includes('/api/ai-lab/chat'));
  assert.ok(widgetJs.includes('/api/ai-lab/config'));
  assert.ok(!widgetJs.includes('openrouter.ai'));
  assert.ok(!widgetJs.includes('sk-'));
  assert.ok(!widgetJs.includes('OPENROUTER_API_KEY'));
});

test('widget renders untrusted content with textContent, not innerHTML', () => {
  assert.ok(widgetJs.includes('textContent'));
  const innerHtmlCalls = widgetJs.match(/innerHTML\s*=(?!\s*'')/g) || [];
  assert.equal(innerHtmlCalls.length, 0, 'widget must not assign innerHTML with dynamic content');
});

test('widget sends the current page for page-aware answers', () => {
  assert.ok(widgetJs.includes("page: window.location.pathname"));
});

test('widget includes a honeypot field and error-state handling', () => {
  assert.ok(widgetJs.includes('website_hp'));
  for (const code of ['RATE_LIMITED', 'NOT_CONFIGURED', 'PROVIDER_ERROR', 'TIMEOUT']) {
    assert.ok(widgetJs.includes(code), `widget must handle ${code}`);
  }
});

test('widget CSS is scoped and respects reduced motion', () => {
  assert.ok(widgetCss.includes('.vac-'));
  assert.ok(widgetCss.includes('prefers-reduced-motion'));
  assert.ok(widgetJs.includes("key === 'Escape'"));
});
