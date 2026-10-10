'use strict';

const { createAiLabApp } = require('./ai-lab-app');

const PORT = Number(process.env.PORT) || 5000;

const app = createAiLabApp();

app.listen(PORT, () => {
  const keyConfigured = Boolean(process.env.OPENROUTER_API_KEY);
  console.log(`[ai-lab] Veltron AI Lab API listening on port ${PORT}`);
  console.log(`[ai-lab] OpenRouter API key: ${keyConfigured ? 'configured' : 'NOT CONFIGURED (chat will return 503)'}`);
  console.log(`[ai-lab] Model: ${process.env.OPENROUTER_MODEL || 'openrouter/auto (default)'}`);
});
