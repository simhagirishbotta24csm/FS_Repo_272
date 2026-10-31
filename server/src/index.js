import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';

const { PORT = 5000, MONGO_URI = 'mongodb://127.0.0.1:27017/murmur', NODE_ENV } = process.env;

if (!process.env.JWT_SECRET) {
  if (NODE_ENV === 'production') {
    console.error('JWT_SECRET must be set in production.');
    process.exit(1);
  }
  process.env.JWT_SECRET = 'dev-only-insecure-secret';
  console.warn('! JWT_SECRET is not set — using an insecure development secret.');
}

try {
  await connectDB(MONGO_URI);
} catch (err) {
  console.error(`Could not connect to MongoDB at ${MONGO_URI}\n  ${err.message}`);
  console.error('Start MongoDB locally, or set MONGO_URI in server/.env (e.g. a MongoDB Atlas URL).');
  process.exit(1);
}

const server = createApp().listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

async function shutdown() {
  server.close();
  await mongoose.connection.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
