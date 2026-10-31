# murmur

A miniature Twitter / community-forum clone built with the MERN stack (MongoDB, Express, React, Node).
People post short text updates with an optional image, like and comment (with nested replies), and follow each other to shape their feed.

## Features

- **Accounts** – register / log in with JWT auth (7-day tokens, bcrypt-hashed passwords, rate-limited auth routes).
- **Dynamic feed** – Home shows posts from people you follow plus your own, newest first, with infinite scroll.
  The page polls every 30s and offers a "Show N new posts" banner. Explore shows everyone's posts (guests can browse it).
- **Posts with images** – up to 280 characters and one JPEG/PNG/GIF/WebP image (4 MB max), uploaded with multer.
  `@mentions` link to profiles; `#hashtags` and URLs are styled.
- **Likes** – on posts and comments, optimistic UI, one like per user enforced by a unique index.
- **Nested comments** – replies to replies, collapsible branches, up to 6 levels deep (deeper replies become siblings).
  Authors can delete their comments; a post's author can delete any comment on their post.
- **Follower / following graph** – follow and unfollow, follower and following lists, "follows you" badge,
  and "People to follow" suggestions ranked by mutual follows (friends-of-friends).
- **Profiles** – avatar, bio, counts, posts / followers / following tabs, edit profile with avatar upload.
- **Search** – debounced people search by username or display name.
- Light and dark themes (follows the OS setting), responsive down to phone width.

## Quick start

Requirements: Node 18+ and a MongoDB instance (local `mongod`, Docker, or a free MongoDB Atlas cluster).

```bash
# 1. install everything
npm run install:all

# 2. configure the API
cp server/.env.example server/.env      # then edit MONGO_URI / JWT_SECRET if needed

# 3. (optional) load demo data — only runs on an empty database
npm run seed                            # add `-- --reset` to wipe and reseed

# 4. run API (http://localhost:5000) and React app (http://localhost:5173) together
npm run dev
```

Open http://localhost:5173. After seeding, log in as `maya`, `dev`, `sofia`, `kenji` or `amara` with password `password123`.

Need MongoDB quickly? `docker run -d -p 27017:27017 --name murmur-mongo mongo:7`

### Production-style run

```bash
npm run build     # builds client/dist
npm start         # API serves the built client at http://localhost:5000 (needs JWT_SECRET set)
```

## Deploying to Vercel (single project)

The client, API and image storage all run on Vercel. `vercel.json` builds the React app, rewrites `/api/*` to the
serverless function in `api/index.js` (which wraps the Express app) and falls back to `index.html` for client routes.

1. Push the project to GitHub (`.env` is git-ignored).
2. MongoDB Atlas → **Network Access** → allow `0.0.0.0/0` (Vercel's IPs change).
3. vercel.com → **Add New → Project** → import the repo. Leave the root directory as the repo root; the settings come from `vercel.json`.
4. Under **Environment Variables** add `MONGO_URI` (with `/murmur` database name) and `JWT_SECRET` (a long random string).
5. In the project's **Storage** tab, create a **Blob** store and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`, so uploads persist.
6. Deploy (or Redeploy after adding variables). Seed demo data from your own machine: `npm run seed`, using the same `MONGO_URI` in `server/.env`.

Notes: uploads are limited to 4 MB because Vercel functions reject request bodies over 4.5 MB. Without `BLOB_READ_WRITE_TOKEN`
(local development) images are saved to `server/uploads` instead.

## Project structure

```
murmur/
├── server/
│   └── src/
│       ├── index.js, app.js        # bootstrap, middleware, routing
│       ├── models/                 # User, Post, Comment, Follow, Like
│       ├── routes/                 # auth, users, posts, comments
│       ├── middleware/             # auth (JWT), upload (multer), error handling
│       ├── lib/                    # pagination + viewer-state helpers, like toggle
│       └── seed.js                 # demo data
└── client/
    └── src/
        ├── api.js                  # fetch wrapper (token, errors, FormData)
        ├── context/AuthContext.jsx
        ├── hooks/useInfiniteList.js
        ├── components/             # PostCard, PostComposer, CommentThread, FollowButton, ...
        └── pages/                  # Home, Explore, Profile, PostDetail, AuthPage
```

## Data model

| Collection | Key fields | Notes |
| --- | --- | --- |
| `User` | username, email, password (hashed, `select: false`), displayName, bio, avatar, followersCount, followingCount, postsCount | Counters are denormalised for cheap profile reads |
| `Post` | author, text, image, likesCount, commentsCount | Index `{author, _id:-1}` serves the feed and profile timelines |
| `Comment` | post, author, parent, depth, text, likesCount | Parent-reference tree; one query loads a thread, the client builds the tree |
| `Follow` | follower → following | One document per edge, unique `{follower, following}`; indexed both directions |
| `Like` | user, targetType (`Post`/`Comment`), target | Unique `{user, targetType, target}` makes liking idempotent and race-safe |

## API

All routes are under `/api`. `🔒` = requires `Authorization: Bearer <token>`. List endpoints take `?limit=` and `?cursor=` and return `{ items, nextCursor }`.

| Method | Route | Description |
| --- | --- | --- |
| POST | `/auth/register` · `/auth/login` | Returns `{ token, user }` |
| GET 🔒 | `/auth/me` | Current user |
| GET | `/users/search?q=` | Prefix search on username / display name |
| GET 🔒 | `/users/suggestions` | Who to follow (mutual follows first) |
| PATCH 🔒 | `/users/me` | Update name, bio, avatar (multipart) |
| GET | `/users/:username` | Profile with `isFollowing`, `followsYou` |
| POST / DELETE 🔒 | `/users/:username/follow` | Follow / unfollow |
| GET | `/users/:username/followers` · `/following` · `/posts` | Paginated lists |
| POST 🔒 | `/posts` | Create post (multipart: `text`, `image`) |
| GET 🔒 | `/posts/feed` · `/posts/feed/new?after=<id>` | Home feed; count of newer posts |
| GET | `/posts/explore` | Global timeline |
| GET / DELETE 🔒 | `/posts/:id` | Read / delete own post (also removes comments, likes, image) |
| POST 🔒 | `/posts/:id/like` | Toggle like → `{ liked, likesCount }` |
| GET / POST 🔒 | `/posts/:id/comments` | Flat thread list / add comment (`{ text, parent? }`) |
| DELETE 🔒 | `/comments/:id` | Delete comment and its replies |
| POST 🔒 | `/comments/:id/like` | Toggle like |

## Design decisions worth knowing

- **Cursor pagination on `_id`**, not skip/limit, so feeds stay stable while new posts arrive and deep pages stay fast.
- **Fan-out on read** for the feed (`author $in [follows]`). Simple and right for this scale; at large scale you would
  precompute timelines.
- **Counters are only changed when a `Like`/`Follow` document is actually created or deleted**, so they cannot drift when
  requests race.
- **Uploads** are stored on local disk (`server/uploads`) with random filenames and an extension derived from the verified MIME type.
  For a real deployment, swap `middleware/upload.js` for S3 / Cloudinary.
- The JWT lives in `localStorage` for simplicity. For a production app, prefer an httpOnly cookie with CSRF protection.

## Ideas to extend

Notifications (Socket.IO), reposts, hashtag pages, private accounts, email verification, image resizing with `sharp`,
automated tests with `mongodb-memory-server` + `supertest`.
