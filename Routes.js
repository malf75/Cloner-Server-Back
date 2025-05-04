const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8000;
const { run } = require('./Cloner-Back');

app.use(express.json());

app.use(express.json({ limit: '1mb' }));

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/', (req, res) => {
  res.send('OK');
});

app.options('/clone', cors(), (req, res) => {
  res.sendStatus(200);
});

app.get('/clone', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  if (!req.query) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Request query is missing or invalid' })}\n\n`);
    res.end();
    return;
  }

  const { token, original, target } = req.query;

  if (!token || !original || !target) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Missing Parameters: token, original, and target are required' })}\n\n`);
    res.end();
    return;
  }

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    await run(token, original, target, sendEvent);
    sendEvent({ type: 'success', message: 'Servidor clonado com sucesso!' });
    res.end();
  } catch (e) {
    sendEvent({ type: 'error', message: `Erro ao clonar: ${e.message}` });
    res.end();
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
