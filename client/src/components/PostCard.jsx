import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import { IconComment, IconHeart, IconTrash } from './Icons.jsx';
import { fullDate, timeAgo } from '../utils/time.js';
import { renderRichText } from '../utils/richText.jsx';

export default function PostCard({ post, onDeleted, detail = false }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [likes, setLikes] = useState(post.likesCount);
  const pending = useRef(false);
  const mine = user && user._id === post.author._id;

  async function toggleLike() {
    if (!user) return navigate('/login');
    if (pending.current) return;
    pending.current = true;
    const before = { liked, likes };
    setLiked(!liked); // optimistic
    setLikes(likes + (liked ? -1 : 1));
    try {
      const res = await api.post(`/posts/${post._id}/like`);
      setLiked(res.liked);
      setLikes(res.likesCount);
    } catch {
      setLiked(before.liked);
      setLikes(before.likes);
    } finally {
      pending.current = false;
    }
  }

  async function remove() {
    if (!window.confirm('Delete this post? Its comments will be removed too.')) return;
    try {
      await api.del(`/posts/${post._id}`);
      setUser((u) => (u ? { ...u, postsCount: Math.max(0, (u.postsCount || 1) - 1) } : u));
      onDeleted?.(post._id);
    } catch (err) {
      window.alert(err.message);
    }
  }

  // Clicking the card body opens the post; links and buttons keep their own behaviour.
  function open(e) {
    if (detail || e.target.closest('a, button')) return;
    navigate(`/post/${post._id}`);
  }

  const { author } = post;
  return (
    <article className={`post${detail ? ' post-detail' : ' post-clickable'}`} onClick={open}>
      <Link to={`/u/${author.username}`} tabIndex={-1} className="post-avatar">
        <Avatar user={author} size={44} />
      </Link>
      <div className="post-main">
        <header className="post-head">
          <Link to={`/u/${author.username}`} className="post-name">
            {author.displayName || author.username}
          </Link>
          <span className="muted">@{author.username}</span>
          <Link to={`/post/${post._id}`} className="post-time muted" title={fullDate(post.createdAt)}>
            {timeAgo(post.createdAt)}
          </Link>
        </header>

        {post.text ? <p className="post-text">{renderRichText(post.text)}</p> : null}
        {post.image ? (
          <a href={post.image} target="_blank" rel="noreferrer" className="post-image">
            <img src={post.image} alt="Attached to the post" loading="lazy" />
          </a>
        ) : null}

        <footer className="post-actions">
          <button
            type="button"
            className={`action-btn like${liked ? ' is-on' : ''}`}
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <IconHeart filled={liked} size={18} />
            <span>{likes || ''}</span>
          </button>
          <Link to={`/post/${post._id}`} className="action-btn" aria-label="Comments">
            <IconComment size={18} />
            <span>{post.commentsCount || ''}</span>
          </Link>
          {mine ? (
            <button type="button" className="action-btn danger push-right" onClick={remove} aria-label="Delete post">
              <IconTrash size={17} />
            </button>
          ) : null}
        </footer>
      </div>
    </article>
  );
}
