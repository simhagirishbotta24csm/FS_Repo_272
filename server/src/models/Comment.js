import mongoose from 'mongoose';

// Nested comments use the "parent reference" pattern: every comment points at its
// parent (or null for top-level). The whole thread is fetched in one query and the
// tree is assembled on the client.
const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    depth: { type: Number, default: 0, min: 0 },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 500 },
    likesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, _id: 1 });
commentSchema.index({ parent: 1 });

export default mongoose.model('Comment', commentSchema);
