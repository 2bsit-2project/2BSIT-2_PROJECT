const express = require('express');
const { PORT, NODE_ENV } = require('./config/env');
const { connectDatabase, getDbStatus } = require('./config/db');

const app = express();
let activePort = PORT;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'InfoMan',
    status: 'ok',
    environment: NODE_ENV,
    port: activePort,
    message: 'Project scaffold is ready.'
  });
});

app.get('/health', async (req, res) => {
  const dbStatus = getDbStatus();

  res.json({
    status: 'ok',
    environment: NODE_ENV,
    port: activePort,
    database: dbStatus
  });
});

async function startServer() {
  await connectDatabase();

  return new Promise((resolve, reject) => {
    const tryListen = (port) => {
      const server = app.listen(port, () => {
        activePort = port;
        console.log(`Server running on http://localhost:${port}`);
        resolve(server);
      });

      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          const nextPort = port + 1;
          if (nextPort <= port + 20) {
            console.warn(`Port ${port} is unavailable. Retrying on ${nextPort}.`);
            tryListen(nextPort);
            return;
          }
        }

        reject(error);
      });
    };

    tryListen(PORT);
  });
}

module.exports = {
  app,
  startServer,
  getServerPort: () => activePort
};
