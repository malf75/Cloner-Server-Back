const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8000;
const { run } = require('./Cloner-Back');
const { v4: uuidv4 } = require('uuid');
const cleanup = (res, sessionId) => {
  res.on('close', () => {
    if (activeSessions.has(sessionId)) {
      activeSessions.delete(sessionId);
    }
  });
};
const corsOptions = {
  origin: ['http://localhost:3000', 'http://0.0.0.0:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  preflightContinue: false
};

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('X-Request-Start', Date.now());
  next();
});
app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setTimeout(300000, () => {
    console.error('Request timed out:', req.originalUrl);
    res.status(504).end();
  });
  next();
});

const activeSessions = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, { timestamp }] of activeSessions) {
    if (now - timestamp > 3600000) {
      activeSessions.delete(sessionId);
    }
  }
}, 60000);

app.post('/clone', async (req, res) => {
  try {
    const { token, original, target } = req.body;
    if (!token || !original || !target) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const sessionId = uuidv4();
    activeSessions.set(sessionId, { 
      token, 
      original, 
      target,
      timestamp: Date.now()
    });

    return res.json({ sessionId });
  } catch (error) {
    console.error('POST /clone error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/clone', async (req, res) => {
  try {
    const sessionId = req.query.sessionId;
    cleanup(res, sessionId);
    if (!sessionId || !activeSessions.has(sessionId)) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    const session = activeSessions.get(sessionId);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'none'
    });

    const heartbeat = setInterval(() => {
      res.write(':\n\n');
    }, 10000);

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const timeout = setTimeout(() => {
      sendEvent({ type: 'error', message: 'Operation timed out' });
      res.end();
    }, 240000);

    try {
      await run(session.token, session.original, session.target, sendEvent);
      sendEvent({ type: 'success', message: 'Clone completed' });
    } catch (error) {
      console.error('Clone error:', error);
      sendEvent({ type: 'error', message: error.message });
    } finally {
      clearInterval(heartbeat);
      clearTimeout(timeout);
      activeSessions.delete(sessionId);
      if (client?.destroy) {
        await client.destroy().catch(console.error);
      }
      res.end();
    }
  } catch (error) {
    console.error('SSE endpoint error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on ${port}`);
});
