import { HttpError } from './httpError.js';

// mongoose.isValidObjectId() accepts any 12-character string, so use a strict check.
export const isObjectId = (value) => typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value);

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Use with router.param('id', validateIdParam)
export function validateIdParam(req, res, next, value) {
  if (!isObjectId(value)) return next(new HttpError(400, 'Invalid id'));
  next();
}
