import mongoose from 'mongoose';

// A single collection for likes on posts and comments. The unique index makes
// "like" idempotent and race-safe: a double click can never create two likes.
const likeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['Post', 'Comment'], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetType' },
  },
  { timestamps: true }
);

likeSchema.index({ user: 1, targetType: 1, target: 1 }, { unique: true });
likeSchema.index({ targetType: 1, target: 1 });

export default mongoose.model('Like', likeSchema);
