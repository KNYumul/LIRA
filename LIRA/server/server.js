import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const environmentFile = path.join(projectDirectory, 'connect.env');
const port = process.env.PORT || 5000;

function getEnvironmentValue(name) {
  const line = readFileSync(environmentFile, 'utf8')
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith(`${name}=`));

  return line?.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
}

const server = createServer((request, response) => {
  if (request.url !== '/api/health' || request.method !== 'GET') {
    response.writeHead(404).end();
    return;
  }

  const connected = mongoose.connection.readyState === 1;
  response.writeHead(connected ? 200 : 503, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    database: connected ? 'connected' : 'disconnected',
  }));
});

async function startServer() {
  const mongoUri = process.env.MONGO_URI || getEnvironmentValue('MONGO_URI');

  if (!mongoUri) {
    throw new Error('MONGO_URI is missing. Add it to connect.env.');
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected');

  server.listen(port, () => {
    console.log(`API server listening at http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Unable to start API server:', error.message);
  process.exit(1);
});
