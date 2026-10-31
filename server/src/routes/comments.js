import express from 'express';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import Like from '../models/Like.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { validateIdParam } from '../utils/ids.js';
import { toggleLike } from '../lib/likes.js';

const router = express.Router();
router.param('id', validateIdParam);

// Delete a comment and every reply beneath it. Allowed for the comment's author
// and for the author of the post it belongs to (moderating their own thread).
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const comment = await Comment.findById(req.params.id);
    if (!comment) throw new HttpError(404, 'Comment not found');

    const post = await Post.findById(comment.post).select('author');
    const isCommentAuthor = comment.author.equals(req.user._id);
    const isPostAuthor = post ? post.author.equals(req.user._id) : false;
    if (!isCommentAuthor && !isPostAuthor) {
      throw new HttpError(403, 'You can only delete your own comments');
    }

    // Breadth-first walk down the reply tree (depth is capped, so this is short).
    const ids = [comment._id];
    let frontier = [comment._id];
    while (frontier.length) {
      frontier = await Comment.distinct('_id', { parent: { $in: frontier } });
      ids.push(...frontier);
    }

    await Promise.all([
      Like.deleteMany({ targetType: 'Comment', target: { $in: ids } }),
      Comment.deleteMany({ _id: { $in: ids } }),
    ]);
    if (post) {
      await Post.updateOne({ _id: post._id }, { $inc: { commentsCount: -ids.length } });
      await Post.updateOne({ _id: post._id, commentsCount: { $lt: 0 } }, { $set: { commentsCount: 0 } });
    }

    res.json({ deleted: ids.map(String) });
  })
);

router.post(
  '/:id/like',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await toggleLike(req.user._id, 'Comment', Comment, req.params.id));
  })
);

export default router;
