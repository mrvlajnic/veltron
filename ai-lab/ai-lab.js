'use strict';

(function () {
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5000'
        : 'https://veltron-backend.onrender.com';

    const els = {
        form: document.getElementById('chat-form'),
        input: document.getElementById('chat-input'),
        send: document.getElementById('chat-send'),
        clear: document.getElementById('chat-clear'),
        log: document.getElementById('chat-log'),
        statusDot: document.getElementById('status-dot'),
        statusText: document.getElementById('status-text'),
        modelLabel: document.getElementById('model-label'),
        configVersionLabel: document.getElementById('config-version-label'),
        charCount: document.getElementById('char-count'),
        configViewer: document.getElementById('config-viewer'),
        configVersionBadge: document.getElementById('config-version-badge'),
        techModel: document.getElementById('tech-model'),
        techConfigVersion: document.getElementById('tech-config-version'),
        techLimitations: document.getElementById('tech-limitations'),
        sampleBtns: Array.from(document.querySelectorAll('.ai-lab-sample-btn')),
    };

    let history = [];
    let busy = false;
    let config = null;

    function setStatus(state, text) {
        els.statusDot.classList.remove('is-ok', 'is-error', 'is-loading');
        if (state) els.statusDot.classList.add(`is-${state}`);
        els.statusText.textContent = text;
    }

    function addMessage(role, text, meta) {
        const wrap = document.createElement('div');
        wrap.className = `ai-lab-msg ai-lab-msg-${role}`;
        wrap.textContent = text;
        if (meta) {
            const metaEl = document.createElement('span');
            metaEl.className = 'ai-lab-msg-meta';
            metaEl.textContent = meta;
            wrap.appendChild(metaEl);
        }
        els.log.appendChild(wrap);
        els.log.scrollTop = els.log.scrollHeight;
        return wrap;
    }

    function addTypingIndicator() {
        const wrap = document.createElement('div');
        wrap.className = 'ai-lab-msg ai-lab-msg-assistant';
        wrap.id = 'typing-indicator';
        const dots = document.createElement('span');
        dots.className = 'ai-lab-typing';
        dots.appendChild(document.createElement('span'));
        dots.appendChild(document.createElement('span'));
        dots.appendChild(document.createElement('span'));
        wrap.appendChild(dots);
        els.log.appendChild(wrap);
        els.log.scrollTop = els.log.scrollHeight;
    }

    function removeTypingIndicator() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    function setBusy(next) {
        busy = next;
        els.send.disabled = next || els.input.value.trim().length === 0;
        els.clear.disabled = next;
        els.sampleBtns.forEach((btn) => { btn.disabled = next; });
        if (next) {
            addTypingIndicator();
        } else {
            removeTypingIndicator();
        }
    }

    function updateCharCount() {
        els.charCount.textContent = `${els.input.value.length} / 2000`;
        if (!busy) els.send.disabled = els.input.value.trim().length === 0;
    }

    function renderConfig(data) {
        els.configViewer.textContent = JSON.stringify(data, null, 2);
        els.configVersionBadge.textContent = `v${data.version}`;
        els.configVersionLabel.textContent = `Config v${data.version}`;
        els.techModel.textContent = data.model;
        els.techConfigVersion.textContent = `v${data.version}`;
        els.techLimitations.textContent = (data.limitations || []).join('; ');
    }

    async function loadConfig() {
        try {
            const res = await fetch(`${API_BASE}/api/ai-lab/config`, { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            config = await res.json();
            renderConfig(config);
            els.send.disabled = els.input.value.trim().length === 0;
            setStatus(config.configured ? 'ok' : 'error', config.configured
                ? 'Assistant configured and ready.'
                : 'Assistant is not configured on the server (missing API key).');
        } catch (err) {
            setStatus('error', 'Assistant backend unreachable. The experiment documentation below remains available.');
            els.configViewer.textContent = '// Configuration could not be loaded from the server.\n// See config/support-assistant.json in the repository.';
        }
    }

    async function sendMessage(text) {
        const message = text.trim();
        if (!message || busy) return;

        addMessage('user', message);
        els.input.value = '';
        updateCharCount();
        setBusy(true);
        setStatus('loading', 'Waiting for the model to respond…');

        const honeypot = els.form.querySelector('[name="website_hp"]');
        const payload = {
            message,
            history,
            website_hp: honeypot ? honeypot.value : '',
        };
        try {
            const res = await fetch(`${API_BASE}/api/ai-lab/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            let data = null;
            try { data = await res.json(); } catch (_) { data = null; }

            if (res.ok && data && typeof data.reply === 'string') {
                history.push({ role: 'user', content: message });
                history.push({ role: 'assistant', content: data.reply });
                if (history.length > 20) history = history.slice(-20);

                const model = data.model || 'unknown model';
                els.modelLabel.textContent = `Model: ${model}`;
                addMessage('assistant', data.reply, `model: ${model}${data.config_version ? ` · config v${data.config_version}` : ''}`);
                setStatus('ok', 'Response received.');
            } else if (res.status === 429 || (data && data.code === 'RATE_LIMITED')) {
                addMessage('error', data && data.error ? data.error : 'Rate limit exceeded. Please wait a moment.');
                setStatus('error', 'Rate limit exceeded — wait before sending more messages.');
            } else if (res.status === 503 || (data && data.code === 'NOT_CONFIGURED')) {
                addMessage('error', data && data.error
                    ? data.error
                    : 'The AI assistant is not configured on this server.');
                setStatus('error', 'The assistant is not configured on the server (missing API key).');
            } else if (res.status === 504 || (data && data.code === 'TIMEOUT')) {
                addMessage('error', 'The model took too long to respond. Please try again.');
                setStatus('error', 'Request timed out.');
            } else {
                const providerError = data && data.code === 'PROVIDER_ERROR';
                addMessage('error', data && data.error
                    ? data.error
                    : 'The AI service is temporarily unavailable. Please try again later.');
                setStatus('error', providerError
                    ? 'Provider error — the service is temporarily unavailable.'
                    : 'Request failed — please try again later.');
            }
        } catch (err) {
            addMessage('error', 'Network error — could not reach the assistant backend.');
            setStatus('error', 'Network error — check your connection.');
        } finally {
            setBusy(false);
            els.input.focus();
        }
    }

    function clearConversation() {
        history = [];
        els.log.innerHTML = '';
        setStatus(config && config.configured ? 'ok' : 'error', config && config.configured
            ? 'Conversation cleared. Assistant is ready.'
            : 'Assistant is not configured on the server (missing API key).');
        els.modelLabel.textContent = 'Model: —';
        els.input.focus();
    }

    els.form.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage(els.input.value);
    });

    els.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(els.input.value);
        }
    });

    els.input.addEventListener('input', updateCharCount);
    els.clear.addEventListener('click', clearConversation);

    els.sampleBtns.forEach((btn) => {
        btn.addEventListener('click', () => sendMessage(btn.dataset.q));
    });

    updateCharCount();
    loadConfig();
})();
