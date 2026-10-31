import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { toSelf } from '../lib/serialize.js';

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in a few minutes.' },
});

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post(
  '/register',
  limiter,
  asyncHandler(async (req, res) => {
    const username = String(req.body.username ?? '').trim().toLowerCase();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    const displayName = String(req.body.displayName ?? '').trim().slice(0, 40) || username;

    if (!USERNAME_RE.test(username)) {
      throw new HttpError(400, 'Username must be 3–20 characters: letters, numbers or underscores');
    }
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');

    const user = await User.create({ username, email, password, displayName });
    res.status(201).json({ token: signToken(user._id), user: toSelf(user) });
  })
);

router.post(
  '/login',
  limiter,
  asyncHandler(async (req, res) => {
    const identifier = String(req.body.identifier ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    if (!identifier || !password) throw new HttpError(400, 'Enter your username or email and password');

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select(
      '+password'
    );
    if (!user || !(await user.comparePassword(password))) {
      throw new HttpError(401, 'Username or password is incorrect');
    }
    res.json({ token: signToken(user._id), user: toSelf(user) });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    res.json(toSelf(user));
  })
);

export default router;
