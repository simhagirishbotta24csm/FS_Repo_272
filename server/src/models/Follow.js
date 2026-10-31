import mongoose from 'mongoose';

// One document per directed edge: `follower` → `following`.
// Keeping edges in their own collection makes the graph cheap to query in both
// directions (followers, following, mutuals) and avoids unbounded arrays on User.
const followSchema = new mongoose.Schema(
  {
    follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

followSchema.index({ follower: 1, following: 1 }, { unique: true }); // no duplicate edges
followSchema.index({ following: 1, _id: -1 }); // "who follows X", newest first
followSchema.index({ follower: 1, _id: -1 }); // "who does X follow", newest first

export default mongoose.model('Follow', followSchema);
