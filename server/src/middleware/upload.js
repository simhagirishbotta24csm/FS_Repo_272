import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { HttpError } from '../utils/httpError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Storage backend:
//  - BLOB_READ_WRITE_TOKEN set (Vercel)  → files go to Vercel Blob (persistent, public URLs)
//  - otherwise (local development)       → files go to server/uploads on disk
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
if (!useBlob && !process.env.VERCEL) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// The extension comes from the validated MIME type, never from the client's filename.
const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const uniqueName = (mimetype) =>
  `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${EXTENSIONS[mimetype]}`;

const storage = useBlob
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOAD_DIR),
      filename: (req, file, cb) => cb(null, uniqueName(file.mimetype)),
    });

const upload = multer({
  storage,
  // Vercel serverless functions reject request bodies over 4.5MB, so stay under it.
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXTENSIONS[file.mimetype]
      ? cb(null, true)
      : cb(new HttpError(400, 'Only JPEG, PNG, GIF or WebP images are allowed')),
});

/** Single-image upload middleware for a multipart field. */
export const uploadImage = (field) => upload.single(field);

/** Persists an uploaded file and returns the URL stored in the database ('' when no file). */
export async function storeUpload(file) {
  if (!file) return '';
  if (!useBlob) return `/uploads/${file.filename}`;
  const { put } = await import('@vercel/blob');
  const blob = await put(`uploads/${uniqueName(file.mimetype)}`, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
  });
  return blob.url;
}

/** Best-effort delete of a previously stored upload. */
export function removeUpload(url) {
  if (!url) return;
  if (url.startsWith('/uploads/')) {
    fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {});
  } else if (useBlob && /^https:\/\//.test(url)) {
    import('@vercel/blob').then(({ del }) => del(url)).catch(() => {});
  }
}
