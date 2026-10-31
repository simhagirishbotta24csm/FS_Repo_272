import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Post from './models/Post.js';
import Comment from './models/Comment.js';
import Follow from './models/Follow.js';
import Like from './models/Like.js';
import { toggleLike } from './lib/likes.js';

// Usage:  npm run seed            (only seeds an empty database)
//         npm run seed -- --reset (wipes users, posts, comments, follows, likes first)

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/murmur';
await connectDB(MONGO_URI);

if (await User.exists({})) {
  if (!process.argv.includes('--reset')) {
    console.log('Database already has users. Re-run with "npm run seed -- --reset" to wipe it and reseed.');
    await mongoose.connection.close();
    process.exit(0);
  }
  await Promise.all([User, Post, Comment, Follow, Like].map((M) => M.deleteMany({})));
  console.log('Existing data removed.');
}

const PASSWORD = 'password123';
const [maya, dev, sofia, kenji, amara] = await User.create([
  { username: 'maya', email: 'maya@example.com', password: PASSWORD, displayName: 'Maya Chen', bio: 'Product designer. Collects fonts and bad puns.' },
  { username: 'dev', email: 'dev@example.com', password: PASSWORD, displayName: 'Dev Patel', bio: 'Backend engineer. Indexes everything.' },
  { username: 'sofia', email: 'sofia@example.com', password: PASSWORD, displayName: 'Sofia Rossi', bio: 'Photographer. Mostly rooftops, sometimes pasta.' },
  { username: 'kenji', email: 'kenji@example.com', password: PASSWORD, displayName: 'Kenji Sato', bio: 'Trail runner and amateur baker.' },
  { username: 'amara', email: 'amara@example.com', password: PASSWORD, displayName: 'Amara Okafor', bio: 'Writing about cities, transit and good coffee.' },
]);

async function follow(a, b) {
  await Follow.create({ follower: a._id, following: b._id });
  await User.updateOne({ _id: a._id }, { $inc: { followingCount: 1 } });
  await User.updateOne({ _id: b._id }, { $inc: { followersCount: 1 } });
}

const edges = [
  [maya, dev], [maya, sofia], [maya, amara],
  [dev, maya], [dev, kenji],
  [sofia, maya], [sofia, amara], [sofia, kenji],
  [kenji, dev], [kenji, sofia],
  [amara, maya],
];
for (const [a, b] of edges) await follow(a, b);

// Oldest first, so _id order matches the timestamps shown in the UI.
const minutesAgo = (m) => new Date(Date.now() - m * 60_000);
const postData = [
  [kenji, 'Sourdough attempt #14. The crumb is finally open. Tell no one how long it took.', 2400],
  [amara, 'Hot take: the best transit map is the one you never have to look at twice.', 1500],
  [dev, 'Reminder that an index you never query is just a slower write.', 900],
  [sofia, 'Golden hour from the roof today. #rooftops', 600],
  [maya, 'Spent the morning choosing between two almost identical greys. Chose one. Regretting it already.', 300],
  [dev, 'Cursor pagination > offset pagination. Fight me (politely).', 120],
  [amara, 'New piece up: why a good bus stop is more important than a good bus. Thoughts welcome, @maya?', 45],
  [maya, 'Welcome to murmur! Say hi, follow a few people, and post something small.', 10],
];
const posts = [];
for (const [author, text, ago] of postData) {
  const post = await Post.create({ author: author._id, text, createdAt: minutesAgo(ago) });
  await User.updateOne({ _id: author._id }, { $inc: { postsCount: 1 } });
  posts.push(post);
}

async function comment(post, author, text, parent = null) {
  const c = await Comment.create({
    post: post._id,
    author: author._id,
    parent: parent?._id ?? null,
    depth: parent ? parent.depth + 1 : 0,
    text,
  });
  await Post.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });
  return c;
}

// A nested thread under Dev's pagination post.
const paginationPost = posts[5];
const c1 = await comment(paginationPost, kenji, 'Offset pagination is fine until page 40,000.');
const c2 = await comment(paginationPost, maya, 'Okay but what do I tell my product manager who wants page numbers?', null);
const c1a = await comment(paginationPost, dev, 'Ha — exactly. Skipping 400k rows just to show 10 is the cost.', c1);
const c1b = await comment(paginationPost, sofia, 'I just scroll until the thing I want appears.', c1);
const c1a1 = await comment(paginationPost, kenji, 'Which is secretly cursor pagination with extra steps.', c1a);
await comment(paginationPost, dev, 'Infinite scroll for feeds, numbered pages for search results. Different jobs.', c2);
await comment(paginationPost, amara, 'This thread should be required reading.', c1a1);

await comment(posts[7], dev, 'Hello from the backend!');
await comment(posts[7], sofia, 'Following everyone immediately.');

const likes = [
  [posts[7], [dev, sofia, kenji, amara]],
  [posts[5], [maya, kenji, sofia]],
  [posts[3], [maya, amara, kenji, dev]],
  [posts[0], [dev, sofia]],
  [posts[6], [maya]],
];
for (const [post, users] of likes) {
  for (const u of users) await toggleLike(u._id, 'Post', Post, post._id);
}
await toggleLike(maya._id, 'Comment', Comment, c1._id);
await toggleLike(dev._id, 'Comment', Comment, c1a1._id);

console.log('Seeded 5 users, 8 posts, nested comments, follows and likes.');
console.log(`Log in as maya, dev, sofia, kenji or amara — password: ${PASSWORD}`);
await mongoose.connection.close();
