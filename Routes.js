const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8000;
const { run, client } = require('./Cloner-Back');
const { v4: uuidv4 } = require('uuid');
const corsOptions = {
  origin: ['http://localhost:3000', 'http://0.0.0.0:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  preflightContinue: false
};

app.use(express.json({ limit: '1mb' }));
app.use(cors(corsOptions));

app.get('/', (req, res) => {
  res.send('OK');
});

const activeSessions = new Map();

app.options('/clone', cors(corsOptions), (req, res) => {
  res.status(204).end();
});

app.post('/clone', cors(corsOptions), async (req, res) => {
  const { token, original, target } = req.body;
  if (!token || !original || !target) {
    return res.status(400).json({ error: 'Missing parameters: token, original, and target are required' });
  }

  const sessionId = uuidv4();
  activeSessions.set(sessionId, { token, original, target });

  res.json({ sessionId });
});

app.get('/clone', cors(corsOptions), async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId || !activeSessions.has(sessionId)) {
    res.status(400).send('Invalid or missing sessionId');
    return;
  }

  const { token, original, target } = activeSessions.get(sessionId);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:3000'
  });

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await run(token, original, target, sendEvent);
    sendEvent({ type: 'success', message: 'Server cloned successfully!' });
  } catch (e) {
    sendEvent({ type: 'error', message: `Error cloning: ${e.message}` });
  } finally {
    res.end();
    if (client && typeof client.destroy === 'function') {
      client.destroy();
    }
    activeSessions.delete(sessionId);
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
