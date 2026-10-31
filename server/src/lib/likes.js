import Like from '../models/Like.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Toggle a like on a Post or Comment.
 * The unique index on Like guarantees one like per user per target, and the
 * counter on the target is only touched when a Like document was really
 * created/removed, so the count cannot drift under concurrent requests.
 */
export async function toggleLike(userId, targetType, Model, targetId) {
  if (!(await Model.exists({ _id: targetId }))) throw new HttpError(404, `${targetType} not found`);

  const removed = await Like.findOneAndDelete({ user: userId, targetType, target: targetId });
  if (removed) {
    const doc = await Model.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } }, { new: true });
    return { liked: false, likesCount: Math.max(0, doc?.likesCount ?? 0) };
  }

  try {
    await Like.create({ user: userId, targetType, target: targetId });
  } catch (err) {
    if (err.code === 11000) {
      // A concurrent request already liked it — report the current state.
      const doc = await Model.findById(targetId).select('likesCount');
      return { liked: true, likesCount: doc?.likesCount ?? 0 };
    }
    throw err;
  }
  const doc = await Model.findByIdAndUpdate(targetId, { $inc: { likesCount: 1 } }, { new: true });
  return { liked: true, likesCount: doc?.likesCount ?? 0 };
}
