import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, trim: true, maxlength: 280, default: '' },
    image: { type: String, default: '' }, // relative URL, e.g. /uploads/abc.jpg
    likesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Powers both the home feed ($in authors, newest first) and profile timelines.
postSchema.index({ author: 1, _id: -1 });

export default mongoose.model('Post', postSchema);
