import Like from '../models/Like.js';
import Follow from '../models/Follow.js';
import { isObjectId } from '../utils/ids.js';

export const PUBLIC_USER_FIELDS =
  'username displayName bio avatar followersCount followingCount postsCount createdAt';

export const AUTHOR_POPULATE = { path: 'author', select: 'username displayName avatar' };

// The account owner sees their own email; nobody else does.
export const toSelf = (u) => ({
  _id: u._id,
  email: u.email,
  username: u.username,
  displayName: u.displayName,
  bio: u.bio,
  avatar: u.avatar,
  followersCount: u.followersCount,
  followingCount: u.followingCount,
  postsCount: u.postsCount,
  createdAt: u.createdAt,
});

/** Cursor pagination on _id (monotonic, indexed, stable while new items arrive). */
export function parsePage(req, { defaultLimit = 10, maxLimit = 30 } = {}) {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || defaultLimit, 1), maxLimit);
  const cursor = isObjectId(req.query.cursor) ? req.query.cursor : null;
  return { limit, cursor };
}

/** Pass rows fetched with limit + 1 so we know whether another page exists. */
export function pageResult(rows, limit) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? String(items[items.length - 1]._id) : null };
}

const plain = (doc) => (typeof doc.toObject === 'function' ? doc.toObject() : doc);

/** Adds `likedByMe` to posts or comments with a single extra query. */
export async function withViewerLikes(rows, targetType, viewer) {
  // Drop posts/comments whose author account no longer exists (populate returns null).
  const items = rows.map(plain).filter((i) => i.author !== null);
  if (!viewer || items.length === 0) return items.map((i) => ({ ...i, likedByMe: false }));
  const liked = await Like.find({
    user: viewer._id,
    targetType,
    target: { $in: items.map((i) => i._id) },
  })
    .select('target')
    .lean();
  const likedIds = new Set(liked.map((l) => String(l.target)));
  return items.map((i) => ({ ...i, likedByMe: likedIds.has(String(i._id)) }));
}

/** Adds `isFollowing` / `isMe` to a list of user documents. */
export async function withFollowState(users, viewer) {
  if (!viewer || users.length === 0) {
    return users.map((u) => ({ ...u, isFollowing: false, isMe: false }));
  }
  const edges = await Follow.find({
    follower: viewer._id,
    following: { $in: users.map((u) => u._id) },
  })
    .select('following')
    .lean();
  const followed = new Set(edges.map((e) => String(e.following)));
  return users.map((u) => ({
    ...u,
    isFollowing: followed.has(String(u._id)),
    isMe: String(u._id) === String(viewer._id),
  }));
}
