const { startServer } = require('./app');

startServer().catch((error) => {
  console.error('Failed to start the application:', error.message);
  process.exit(1);
});
