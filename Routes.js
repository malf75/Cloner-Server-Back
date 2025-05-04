const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8000;
const { run, client } = require('./Cloner-Back');
const { v4: uuidv4 } = require('uuid');

app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.get('/', (req, res) => {
  res.send('OK');
});

app.options('/clone', cors(), (req, res) => {
  res.sendStatus(200);
});

const activeSessions = new Map();

app.post('/clone', async (req, res) => {
  const { token, original, target } = req.body;
  if (!token || !original || !target) {
    return res.status(400).json({ error: 'Missing parameters: token, original, and target are required' });
  }

  const sessionId = uuidv4();
  activeSessions.set(sessionId, { token, original, target });

  res.json({ sessionId });
});

app.get('/clone', async (req, res) => {
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
