import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { HttpError } from '../utils/httpError.js';

async function resolveUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(id).select('username displayName avatar');
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const user = await resolveUser(req);
  if (!user) return next(new HttpError(401, 'Authentication required'));
  req.user = user;
  next();
}

/** Attaches req.user when a valid token is present, but lets guests through. */
export async function optionalAuth(req, res, next) {
  req.user = await resolveUser(req);
  next();
}
