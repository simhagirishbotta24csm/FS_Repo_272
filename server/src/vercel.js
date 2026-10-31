import mongoose from 'mongoose';
import { createApp } from './app.js';

let connecting;

async function ensureDatabaseConnection(req, res, next) {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set');
    }
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }
    if (mongoose.connection.readyState !== 1) {
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
    return next();
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    return res.status(500).json({
      message: 'The API service is not configured correctly.',
    });
  }
}

// Export an Express app so Vercel can detect and serve its routes.
const app = createApp({ beforeRoutes: ensureDatabaseConnection });

export default app;
