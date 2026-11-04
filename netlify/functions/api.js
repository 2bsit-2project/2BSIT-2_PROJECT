const serverless = require('serverless-http');
const { app } = require('../../src/app');
const { connectDatabase } = require('../../src/config/db');

const serverlessHandler = serverless(app, {
  basePath: '/.netlify/functions/api'
});
let databaseReady;

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!databaseReady) {
    databaseReady = connectDatabase();
  }
  await databaseReady;
  return serverlessHandler(event, context);
};
