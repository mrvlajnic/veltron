'use strict';

/**
 * Veltron AI Chat Widget — site-wide floating assistant.
 * Injects a bubble (bottom-right) that opens a chat panel backed by the
 * same /api/ai-lab API as the AI Lab playground. Skipped on /ai-lab/ itself.
 */
(function () {
  if (window.__vacLoaded) return;
  if (/(^|\/)ai-lab(\/|$)/.test(window.location.pathname)) return;
  window.__vacLoaded = true;

  var API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://veltron-backend.onrender.com';
  var HISTORY_KEY = 'veltron_ai_chat_history';
  var HINT_KEY = 'veltron_ai_chat_hint_dismissed';
  var MAX_HISTORY_ENTRIES = 20;

  var history = [];
  try {
    var stored = sessionStorage.getItem(HISTORY_KEY);
    if (stored) {
      var parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        history = parsed.filter(function (m) {
          return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
        }).slice(-MAX_HISTORY_ENTRIES);
      }
    }
  } catch (e) { history = []; }

  var busy = false;
  var configured = null;

  function persistHistory() {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY_ENTRIES)));
    } catch (e) { /* storage unavailable — history stays in-memory */ }
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  // ---- DOM construction (no innerHTML — untrusted content renders via textContent) ----
  var root = el('div', 'vac-root');

  var hint = el('div', 'vac-hint');
  hint.setAttribute('role', 'status');
  hint.appendChild(el('span', 'vac-hint-text', 'Ask me anything about Veltron'));
  var hintClose = el('button', 'vac-hint-close', '×');
  hintClose.type = 'button';
  hintClose.setAttribute('aria-label', 'Dismiss chat hint');
  hint.appendChild(hintClose);

  var panel = el('div', 'vac-panel');
  panel.id = 'vac-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Veltron chat assistant');
  panel.setAttribute('aria-hidden', 'true');

  var header = el('div', 'vac-header');
  var headerLeft = el('div', 'vac-header-left');
  var statusDot = el('span', 'vac-status-dot');
  headerLeft.appendChild(statusDot);
  headerLeft.appendChild(el('span', 'vac-title', 'Veltron Assistant'));
  headerLeft.appendChild(el('span', 'vac-exp-tag', 'experimental'));
  var headerRight = el('div', 'vac-header-right');
  var clearBtn = el('button', 'vac-icon-btn', '↺');
  clearBtn.type = 'button';
  clearBtn.title = 'Clear conversation';
  clearBtn.setAttribute('aria-label', 'Clear conversation');
  var closeBtn = el('button', 'vac-icon-btn', '×');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close chat');
  headerRight.appendChild(clearBtn);
  headerRight.appendChild(closeBtn);
  header.appendChild(headerLeft);
  header.appendChild(headerRight);

  var log = el('div', 'vac-log');
  log.setAttribute('aria-live', 'polite');

  var chips = el('div', 'vac-chips');
  var chip = el('button', 'vac-chip', "What's on this page?");
  chip.type = 'button';
  chips.appendChild(chip);

  var form = el('form', 'vac-form');
  var honeypot = el('input', 'vac-hp');
  honeypot.type = 'text';
  honeypot.name = 'website_hp';
  honeypot.tabIndex = -1;
  honeypot.autocomplete = 'off';
  honeypot.setAttribute('aria-hidden', 'true');
  var input = el('input', 'vac-input');
  input.type = 'text';
  input.placeholder = 'Ask about Veltron or this page…';
  input.maxLength = 2000;
  input.setAttribute('aria-label', 'Message');
  var send = el('button', 'vac-send', 'Send');
  send.type = 'submit';
  send.disabled = true;
  form.appendChild(honeypot);
  form.appendChild(input);
  form.appendChild(send);

  var foot = el('div', 'vac-foot', 'Experimental AI · may be inaccurate · not an official support channel');

  panel.appendChild(header);
  panel.appendChild(log);
  panel.appendChild(chips);
  panel.appendChild(form);
  panel.appendChild(foot);

  var bubble = el('button', 'vac-bubble');
  bubble.type = 'button';
  bubble.setAttribute('aria-label', 'Open chat assistant');
  bubble.setAttribute('aria-expanded', 'false');
  bubble.setAttribute('aria-controls', 'vac-panel');
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '26');
  svg.setAttribute('height', '26');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  var icon = document.createElementNS(ns, 'path');
  icon.setAttribute('d', 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z');
  svg.appendChild(icon);
  bubble.appendChild(svg);

  root.appendChild(hint);
  root.appendChild(panel);
  root.appendChild(bubble);

  function mount() {
    if (document.body && !root.parentNode) document.body.appendChild(root);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  // ---- rendering ----
  function addMsg(role, text, meta) {
    var wrap = el('div', 'vac-msg vac-msg-' + role);
    wrap.appendChild(el('div', 'vac-msg-text', text));
    if (meta) wrap.appendChild(el('div', 'vac-msg-meta', meta));
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
  }

  function renderLog() {
    while (log.firstChild) log.removeChild(log.firstChild);
    if (history.length === 0) {
      addMsg('assistant', 'Hi — I’m the Veltron assistant. Ask me anything about Veltron Auto, its concepts, or this page.');
    } else {
      history.forEach(function (m) { addMsg(m.role, m.content); });
    }
  }

  function setStatus(state) {
    statusDot.className = 'vac-status-dot' + (state ? ' is-' + state : '');
  }

  var typing = null;
  function showTyping() {
    typing = el('div', 'vac-msg vac-msg-assistant vac-typing');
    typing.appendChild(el('span'));
    typing.appendChild(el('span'));
    typing.appendChild(el('span'));
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
  }
  function hideTyping() {
    if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
    typing = null;
  }

  // ---- open / close / hint ----
  function setOpen(open) {
    panel.classList.toggle('is-open', open);
    bubble.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    bubble.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      dismissHint(true);
      input.focus();
    } else {
      bubble.focus();
    }
  }

  function hintDismissedPermanently() {
    try { return sessionStorage.getItem(HINT_KEY) === '1'; } catch (e) { return false; }
  }

  function dismissHint(permanent) {
    hint.classList.remove('is-visible');
    hint.classList.add('is-hidden');
    if (permanent) {
      try { sessionStorage.setItem(HINT_KEY, '1'); } catch (e) { /* ignore */ }
    }
  }

  if (!hintDismissedPermanently()) {
    window.setTimeout(function () {
      if (!panel.classList.contains('is-open')) hint.classList.add('is-visible');
    }, 2200);
    window.setTimeout(function () {
      hint.classList.remove('is-visible');
    }, 12200);
  } else {
    hint.classList.add('is-hidden');
  }

  // ---- chat ----
  function updateSend() {
    send.disabled = busy || input.value.trim().length === 0;
  }

  function send(text) {
    var message = (text || '').trim();
    if (!message || busy) return;

    addMsg('user', message);
    var payload = {
      message: message,
      history: history.slice(),
      website_hp: honeypot.value,
      page: window.location.pathname,
    };
    history.push({ role: 'user', content: message });
    if (history.length > MAX_HISTORY_ENTRIES) history = history.slice(-MAX_HISTORY_ENTRIES);
    persistHistory();

    input.value = '';
    updateSend();
    busy = true;
    showTyping();
    setStatus('loading');

    fetch(API_BASE + '/api/ai-lab/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        return { status: res.status, data: data };
      });
    }).then(function (out) {
      var data = out.data;
      if (out.status === 200 && data && typeof data.reply === 'string') {
        history.push({ role: 'assistant', content: data.reply });
        if (history.length > MAX_HISTORY_ENTRIES) history = history.slice(-MAX_HISTORY_ENTRIES);
        persistHistory();
        var meta = 'model: ' + (data.model || 'unknown') +
          (data.config_version ? ' · config v' + data.config_version : '') +
          (Array.isArray(data.browsed_pages) && data.browsed_pages.length ? ' · live site: ' + data.browsed_pages.join(', ') : '');
        addMsg('assistant', data.reply, meta);
        setStatus('ok');
      } else if (out.status === 429 || (data && data.code === 'RATE_LIMITED')) {
        addMsg('error', (data && data.error) || 'Rate limit exceeded. Please wait a moment.');
        setStatus('error');
      } else if (out.status === 503 || (data && data.code === 'NOT_CONFIGURED')) {
        addMsg('error', (data && data.error) || 'The assistant is not configured on this server.');
        setStatus('error');
        configured = false;
      } else if (out.status === 504 || (data && data.code === 'TIMEOUT')) {
        addMsg('error', 'The model took too long to respond. Please try again.');
        setStatus('error');
      } else {
        var providerError = data && data.code === 'PROVIDER_ERROR';
        addMsg('error', (data && data.error) || (providerError
          ? 'Provider error — the service is temporarily unavailable.'
          : 'The AI service is temporarily unavailable. Please try again later.'));
        setStatus('error');
      }
    }).catch(function () {
      addMsg('error', 'Network error — could not reach the assistant.');
      setStatus('error');
    }).finally(function () {
      busy = false;
      hideTyping();
      updateSend();
    });
  }

  // ---- events ----
  bubble.addEventListener('click', function () {
    setOpen(!panel.classList.contains('is-open'));
  });
  closeBtn.addEventListener('click', function () { setOpen(false); });
  clearBtn.addEventListener('click', function () {
    history = [];
    persistHistory();
    renderLog();
    setStatus(configured === false ? 'error' : 'ok');
  });
  hint.addEventListener('click', function (e) {
    if (e.target === hintClose) return;
    setOpen(true);
  });
  hintClose.addEventListener('click', function (e) {
    e.stopPropagation();
    dismissHint(true);
  });
  chip.addEventListener('click', function () { send("What is on this page?"); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    send(input.value);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input.value);
    }
  });
  input.addEventListener('input', updateSend);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) setOpen(false);
  });

  // ---- init ----
  renderLog();
  fetch(API_BASE + '/api/ai-lab/config', { headers: { Accept: 'application/json' } })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      configured = Boolean(data && data.configured);
      setStatus(configured ? 'ok' : 'error');
      if (configured === false) {
        addMsg('error', 'The assistant is not configured on the server (missing API key).');
      }
    })
    .catch(function () {
      setStatus('error');
    });
})();
