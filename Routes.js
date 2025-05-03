const express = require('express');
const app = express();
const port = 8000;
const { run } = require('./Cloner-Back');

// Middleware to parse JSON bodies
app.use(express.json());

// Debugging middleware to log incoming requests
app.use((req, res, next) => {
  console.log('Request Method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next(); // Call next to pass control to the next middleware/route
});

// POST route for cloning
app.post('/clone', async (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Check if req.body is defined
  if (!req.body) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Request body is missing or invalid' })}\n\n`);
    res.end();
    return;
  }

  const { token, original, target } = req.body;

  // Validate parameters
  if (!token || !original || !target) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Missing Parameters: token, original, and target are required' })}\n\n`);
    res.end();
    return;
  }

  // Function to send SSE events
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

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});