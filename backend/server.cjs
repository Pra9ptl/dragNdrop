const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNodeExpressEndpoint,
} = require('@copilotkit/runtime');

dotenv.config();

const app = express();

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const port = Number(process.env.COPILOT_BACKEND_PORT || 4000);

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in environment. Add it to your .env file.');
  process.exit(1);
}

const serviceAdapter = new OpenAIAdapter({
  model: process.env.COPILOT_MODEL || 'gpt-4o-mini',
});

const runtime = new CopilotRuntime();
const handler = copilotRuntimeNodeExpressEndpoint({
  endpoint: '/copilotkit',
  runtime,
  serviceAdapter,
  cors: {
    origin: frontendOrigin,
    credentials: true,
  },
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use((req, res) => handler(req, res));

app.listen(port, () => {
  console.log(`Copilot runtime listening on http://localhost:${port}/copilotkit`);
});
