// Vercel serverless entry point: every /api/* request is rewritten here (see vercel.json)
// and handed to the Express app. The MongoDB connection is cached across warm invocations.
import mongoose from 'mongoose';
import { createApp } from '../server/src/app.js';

let app;
let connecting;

async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  mongoose.set('strictQuery', true);
  connecting ??= mongoose
    .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000, bufferCommands: false })
    .catch((err) => {
      connecting = null; // allow a retry on the next request
      throw err;
    });
  await connecting;
}

export default async function handler(req, res) {
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
    await ensureDb();
    app ??= createApp();
    return app(req, res);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: `Server is not configured correctly: ${err.message}` }));
  }
}
