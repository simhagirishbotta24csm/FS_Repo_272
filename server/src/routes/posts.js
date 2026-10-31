import express from 'express';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Follow from '../models/Follow.js';
import Like from '../models/Like.js';
import User from '../models/User.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { uploadImage, storeUpload, removeUpload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { isObjectId, validateIdParam } from '../utils/ids.js';
import { toggleLike } from '../lib/likes.js';
import { AUTHOR_POPULATE, parsePage, pageResult, withViewerLikes } from '../lib/serialize.js';

const router = express.Router();
router.param('id', validateIdParam);

// Replies deeper than this are attached to the same parent as the comment being
// answered (i.e. they become siblings) so threads never grow unreadably deep.
const MAX_COMMENT_DEPTH = 5;

// ---- Create ----------------------------------------------------------------

router.post(
  '/',
  requireAuth,
  uploadImage('image'),
  asyncHandler(async (req, res) => {
    const text = String(req.body.text ?? '').trim();
    const image = await storeUpload(req.file);

    let post;
    try {
      if (!text && !image) throw new HttpError(400, 'Write something or attach an image');
      if (text.length > 280) throw new HttpError(400, 'Posts are limited to 280 characters');
      post = await Post.create({ author: req.user._id, text, image });
    } catch (err) {
      removeUpload(image);
      throw err;
    }

    await User.updateOne({ _id: req.user._id }, { $inc: { postsCount: 1 } });
    const [out] = await withViewerLikes([{ ...post.toObject(), author: req.user.toObject() }], 'Post', req.user);
    res.status(201).json(out);
  })
);

// ---- Feeds (declared before /:id) -----------------------------------------

// Home feed: posts from people I follow, plus my own. "Fan-out on read" — fine at
// this scale and keeps writes cheap.
router.get(
  '/feed',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { limit, cursor } = parsePage(req);
    const followingIds = await Follow.distinct('following', { follower: req.user._id });
    const filter = { author: { $in: [...followingIds, req.user._id] } };
    if (cursor) filter._id = { $lt: cursor };

    const rows = await Post.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate(AUTHOR_POPULATE)
      .lean();

    const { items, nextCursor } = pageResult(rows, limit);
    res.json({ items: await withViewerLikes(items, 'Post', req.user), nextCursor });
  })
);

// Cheap poll target for the "N new posts" banner.
router.get(
  '/feed/new',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { after } = req.query;
    if (!isObjectId(after)) return res.json({ count: 0 });
    const followingIds = await Follow.distinct('following', { follower: req.user._id });
    const count = await Post.countDocuments(
      { author: { $in: followingIds }, _id: { $gt: after } },
      { limit: 99 }
    );
    res.json({ count });
  })
);

router.get(
  '/explore',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { limit, cursor } = parsePage(req);
    const filter = cursor ? { _id: { $lt: cursor } } : {};

    const rows = await Post.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate(AUTHOR_POPULATE)
      .lean();

    const { items, nextCursor } = pageResult(rows, limit);
    res.json({ items: await withViewerLikes(items, 'Post', req.user), nextCursor });
  })
);

// ---- Single post -----------------------------------------------------------

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id).populate(AUTHOR_POPULATE).lean();
    if (!post) throw new HttpError(404, 'Post not found');
    const [out] = await withViewerLikes([post], 'Post', req.user);
    res.json(out);
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) throw new HttpError(404, 'Post not found');
    if (!post.author.equals(req.user._id)) throw new HttpError(403, 'You can only delete your own posts');

    const commentIds = await Comment.distinct('_id', { post: post._id });
    await Promise.all([
      Like.deleteMany({ targetType: 'Comment', target: { $in: commentIds } }),
      Like.deleteMany({ targetType: 'Post', target: post._id }),
      Comment.deleteMany({ post: post._id }),
      post.deleteOne(),
      User.updateOne({ _id: req.user._id, postsCount: { $gt: 0 } }, { $inc: { postsCount: -1 } }),
    ]);
    removeUpload(post.image);
    res.json({ deleted: post._id });
  })
);

router.post(
  '/:id/like',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await toggleLike(req.user._id, 'Post', Post, req.params.id));
  })
);

// ---- Comments --------------------------------------------------------------

// Returns a flat, oldest-first list; the client assembles the tree from `parent`.
router.get(
  '/:id/comments',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!(await Post.exists({ _id: req.params.id }))) throw new HttpError(404, 'Post not found');
    const rows = await Comment.find({ post: req.params.id })
      .sort({ _id: 1 })
      .limit(1000)
      .populate(AUTHOR_POPULATE)
      .lean();
    res.json({ items: await withViewerLikes(rows, 'Comment', req.user) });
  })
);

router.post(
  '/:id/comments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const text = String(req.body.text ?? '').trim();
    if (!text) throw new HttpError(400, 'Write a comment first');
    if (text.length > 500) throw new HttpError(400, 'Comments are limited to 500 characters');

    const post = await Post.findById(req.params.id).select('_id');
    if (!post) throw new HttpError(404, 'Post not found');

    let parent = null;
    let depth = 0;
    if (req.body.parent) {
      if (!isObjectId(String(req.body.parent))) throw new HttpError(400, 'Invalid parent comment');
      const target = await Comment.findOne({ _id: req.body.parent, post: post._id });
      if (!target) throw new HttpError(404, 'The comment you are replying to no longer exists');
      if (target.depth >= MAX_COMMENT_DEPTH) {
        parent = target.parent;
        depth = target.depth;
      } else {
        parent = target._id;
        depth = target.depth + 1;
      }
    }

    const comment = await Comment.create({ post: post._id, author: req.user._id, parent, depth, text });
    await Post.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });

    const [out] = await withViewerLikes(
      [{ ...comment.toObject(), author: req.user.toObject() }],
      'Comment',
      req.user
    );
    res.status(201).json(out);
  })
);

export default router;
