import express from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Follow from '../models/Follow.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { uploadImage, storeUpload, removeUpload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { escapeRegex } from '../utils/ids.js';
import {
  PUBLIC_USER_FIELDS,
  AUTHOR_POPULATE,
  toSelf,
  parsePage,
  pageResult,
  withViewerLikes,
  withFollowState,
} from '../lib/serialize.js';

const router = express.Router();

async function findUserOr404(username) {
  const user = await User.findOne({ username: String(username).toLowerCase() })
    .select(PUBLIC_USER_FIELDS)
    .lean();
  if (!user) throw new HttpError(404, 'User not found');
  return user;
}

// ---- Discovery -------------------------------------------------------------

router.get(
  '/search',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim().slice(0, 30);
    if (!q) return res.json({ items: [] });
    const prefix = new RegExp(`^${escapeRegex(q)}`, 'i');
    const users = await User.find({ $or: [{ username: prefix }, { displayName: prefix }] })
      .sort({ followersCount: -1 })
      .limit(8)
      .select(PUBLIC_USER_FIELDS)
      .lean();
    res.json({ items: await withFollowState(users, req.user) });
  })
);

// "Who to follow": friends-of-friends ranked by how many of my follows follow them,
// topped up with the most-followed accounts when the graph is still small.
router.get(
  '/suggestions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.user._id;
    const following = await Follow.distinct('following', { follower: me });
    const exclude = [...following, me];

    const mutual = following.length
      ? await Follow.aggregate([
          { $match: { follower: { $in: following }, following: { $nin: exclude } } },
          { $group: { _id: '$following', mutuals: { $sum: 1 } } },
          { $sort: { mutuals: -1, _id: 1 } },
          { $limit: 5 },
        ])
      : [];

    const ids = mutual.map((m) => m._id);
    const mutualCounts = new Map(mutual.map((m) => [String(m._id), m.mutuals]));

    if (ids.length < 5) {
      const filler = await User.find({ _id: { $nin: [...exclude, ...ids] } })
        .sort({ followersCount: -1, _id: -1 })
        .limit(5 - ids.length)
        .select('_id')
        .lean();
      ids.push(...filler.map((f) => f._id));
    }

    const users = await User.find({ _id: { $in: ids } }).select(PUBLIC_USER_FIELDS).lean();
    const order = new Map(ids.map((id, i) => [String(id), i]));
    users.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));

    res.json({
      items: users.map((u) => ({
        ...u,
        isFollowing: false,
        isMe: false,
        mutualFollowers: mutualCounts.get(String(u._id)) || 0,
      })),
    });
  })
);

// ---- Own profile -----------------------------------------------------------

router.patch(
  '/me',
  requireAuth,
  uploadImage('avatar'),
  asyncHandler(async (req, res) => {
    const newAvatar = await storeUpload(req.file);
    try {
      const user = await User.findById(req.user._id);

      if (typeof req.body.displayName === 'string') {
        const displayName = req.body.displayName.trim();
        if (!displayName) throw new HttpError(400, 'Display name cannot be empty');
        if (displayName.length > 40) throw new HttpError(400, 'Display name is limited to 40 characters');
        user.displayName = displayName;
      }
      if (typeof req.body.bio === 'string') {
        const bio = req.body.bio.trim();
        if (bio.length > 160) throw new HttpError(400, 'Bio is limited to 160 characters');
        user.bio = bio;
      }

      const oldAvatar = user.avatar;
      if (newAvatar) user.avatar = newAvatar;
      await user.save();
      if (newAvatar) removeUpload(oldAvatar);

      res.json(toSelf(user));
    } catch (err) {
      removeUpload(newAvatar);
      throw err;
    }
  })
);

// ---- Profiles & graph ------------------------------------------------------

router.get(
  '/:username',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const user = await findUserOr404(req.params.username);
    const [withState] = await withFollowState([user], req.user);
    const followsYou = req.user
      ? Boolean(await Follow.exists({ follower: user._id, following: req.user._id }))
      : false;
    res.json({ ...withState, followsYou });
  })
);

router.post(
  '/:username/follow',
  requireAuth,
  asyncHandler(async (req, res) => {
    const target = await findUserOr404(req.params.username);
    if (String(target._id) === String(req.user._id)) {
      throw new HttpError(400, 'You cannot follow yourself');
    }

    let created = true;
    try {
      await Follow.create({ follower: req.user._id, following: target._id });
    } catch (err) {
      if (err.code !== 11000) throw err;
      created = false; // already following — treat as success
    }

    if (created) {
      await Promise.all([
        User.updateOne({ _id: req.user._id }, { $inc: { followingCount: 1 } }),
        User.updateOne({ _id: target._id }, { $inc: { followersCount: 1 } }),
      ]);
    }
    const [me, them] = await Promise.all([
      User.findById(req.user._id).select('followingCount'),
      User.findById(target._id).select('followersCount'),
    ]);
    res.json({
      isFollowing: true,
      followersCount: them.followersCount,
      myFollowingCount: me.followingCount,
    });
  })
);

router.delete(
  '/:username/follow',
  requireAuth,
  asyncHandler(async (req, res) => {
    const target = await findUserOr404(req.params.username);
    const removed = await Follow.findOneAndDelete({ follower: req.user._id, following: target._id });

    if (removed) {
      await Promise.all([
        User.updateOne({ _id: req.user._id }, { $inc: { followingCount: -1 } }),
        User.updateOne({ _id: target._id }, { $inc: { followersCount: -1 } }),
      ]);
    }
    const [me, them] = await Promise.all([
      User.findById(req.user._id).select('followingCount'),
      User.findById(target._id).select('followersCount'),
    ]);
    res.json({
      isFollowing: false,
      followersCount: Math.max(0, them.followersCount),
      myFollowingCount: Math.max(0, me.followingCount),
    });
  })
);

async function listEdges(req, res, { match, populate }) {
  const target = await findUserOr404(req.params.username);
  const { limit, cursor } = parsePage(req, { defaultLimit: 15 });
  const filter = { [match]: target._id };
  if (cursor) filter._id = { $lt: cursor };

  const rows = await Follow.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate({ path: populate, select: PUBLIC_USER_FIELDS })
    .lean();

  const { items: edges, nextCursor } = pageResult(rows, limit);
  const users = edges.map((e) => e[populate]).filter(Boolean);
  res.json({ items: await withFollowState(users, req.user), nextCursor });
}

router.get(
  '/:username/followers',
  optionalAuth,
  asyncHandler((req, res) => listEdges(req, res, { match: 'following', populate: 'follower' }))
);

router.get(
  '/:username/following',
  optionalAuth,
  asyncHandler((req, res) => listEdges(req, res, { match: 'follower', populate: 'following' }))
);

router.get(
  '/:username/posts',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const user = await findUserOr404(req.params.username);
    const { limit, cursor } = parsePage(req);
    const filter = { author: user._id };
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

export default router;
