import mongoose from 'mongoose';
import { createApp } from './app.js';

const app = createApp();
let connecting;

async function ensureDatabaseConnection() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }

  mongoose.set('strictQuery', true);
  connecting ??= mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      bufferCommands: false,
    })
    .catch((error) => {
      connecting = null;
      throw error;
    });

  await connecting;
}

export default async function handler(req, res) {
  try {
    await ensureDatabaseConnection();
    return app(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    return res.status(500).json({
      message: 'The API service is not configured correctly.',
    });
  }
}
