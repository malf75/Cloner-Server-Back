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

app.use((req, res, next) => {
  res.set('Connection', 'keep-alive');
  res.set('Keep-Alive', 'timeout=30');
  next();
});

app.get('/', (req, res) => {
  res.send('OK');
});

const activeSessions = new Map();

app.get('/clone', cors(corsOptions), async (req, res) => {
  try {
    const sessionId = req.query.sessionId;
    if (!sessionId || !activeSessions.has(sessionId)) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    const { token, original, target } = activeSessions.get(sessionId);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const heartbeat = setInterval(() => {
      res.write(':ping\n\n');
    }, 15000);

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await run(token, original, target, sendEvent);
      sendEvent({ type: 'success', message: 'Server cloned successfully!' });
    } catch (e) {
      sendEvent({ type: 'error', message: `Error: ${e.message}` });
    } finally {
      clearInterval(heartbeat);
      res.end();
      activeSessions.delete(sessionId);
      if (client && client.destroy) {
        await client.destroy().catch(() => {});
      }
    }
  } catch (error) {
    console.error('SSE endpoint error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
