import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import { IconHeart, IconReply, IconTrash } from './Icons.jsx';
import { fullDate, timeAgo } from '../utils/time.js';
import { renderRichText } from '../utils/richText.jsx';

const MAX_CHARS = 500;

/** Turns the server's flat, oldest-first list into a tree using each comment's `parent`. */
function buildTree(list) {
  const byId = new Map(list.map((c) => [c._id, { ...c, replies: [] }]));
  const roots = [];
  for (const node of byId.values()) {
    const parent = node.parent ? byId.get(node.parent) : null;
    (parent ? parent.replies : roots).push(node);
  }
  return roots;
}

const countDescendants = (node) =>
  node.replies.reduce((sum, child) => sum + 1 + countDescendants(child), 0);

function CommentBox({ onSubmit, onCancel, autoFocus, placeholder, submitLabel }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(value);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const remaining = MAX_CHARS - text.length;
  return (
    <form className="comment-box" onSubmit={submit}>
      <textarea
        value={text}
        rows={2}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e);
        }}
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="comment-box-row">
        <span className={`counter${remaining < 0 ? ' over' : ''}`}>{remaining <= 60 ? remaining : ''}</span>
        {onCancel ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          className="btn btn-solid btn-sm"
          disabled={busy || !text.trim() || remaining < 0}
        >
          {busy ? 'Sending…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function CommentNode({ node, depth, ctx }) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const canDelete = user && (user._id === node.author._id || user._id === ctx.postAuthorId);
  const hidden = countDescendants(node);

  async function sendReply(text) {
    await ctx.add(text, node._id);
    setReplying(false);
    setCollapsed(false);
  }

  return (
    <div className="comment">
      <div className="comment-row">
        <Link to={`/u/${node.author.username}`} tabIndex={-1}>
          <Avatar user={node.author} size={32} />
        </Link>
        <div className="comment-main">
          <div className="comment-meta">
            <Link to={`/u/${node.author.username}`} className="post-name">
              {node.author.displayName || node.author.username}
            </Link>
            <span className="muted">@{node.author.username}</span>
            <span className="muted" title={fullDate(node.createdAt)}>
              {timeAgo(node.createdAt)}
            </span>
          </div>
          <p className="comment-text">{renderRichText(node.text)}</p>
          <div className="comment-actions">
            <button
              type="button"
              className={`action-btn like${node.likedByMe ? ' is-on' : ''}`}
              onClick={() => ctx.like(node)}
              aria-pressed={node.likedByMe}
              aria-label={node.likedByMe ? 'Unlike comment' : 'Like comment'}
            >
              <IconHeart filled={node.likedByMe} size={15} />
              <span>{node.likesCount || ''}</span>
            </button>
            {user ? (
              <button type="button" className="action-btn" onClick={() => setReplying((r) => !r)}>
                <IconReply size={15} />
                <span>Reply</span>
              </button>
            ) : null}
            {node.replies.length > 0 ? (
              <button type="button" className="action-btn" onClick={() => setCollapsed((c) => !c)}>
                {collapsed ? `Show ${hidden} ${hidden === 1 ? 'reply' : 'replies'}` : 'Hide replies'}
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="action-btn danger push-right"
                onClick={() => ctx.remove(node)}
                aria-label="Delete comment"
              >
                <IconTrash size={15} />
              </button>
            ) : null}
          </div>
          {replying ? (
            <CommentBox
              autoFocus
              placeholder={`Reply to @${node.author.username}`}
              submitLabel="Reply"
              onSubmit={sendReply}
              onCancel={() => setReplying(false)}
            />
          ) : null}
        </div>
      </div>

      {node.replies.length > 0 && !collapsed ? (
        <div className={`thread-children${depth >= 3 ? ' flat' : ''}`}>
          {node.replies.map((child) => (
            <CommentNode key={child._id} node={child} depth={depth + 1} ctx={ctx} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CommentThread({ postId, postAuthorId, onCountChange }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    api
      .get(`/posts/${postId}/comments`)
      .then((data) => alive && setComments(data.items))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [postId]);

  const tree = useMemo(() => buildTree(comments), [comments]);

  const ctx = useMemo(
    () => ({
      postAuthorId,
      async add(text, parent) {
        const created = await api.post(`/posts/${postId}/comments`, { text, parent });
        setComments((prev) => [...prev, created]);
        onCountChange?.(1);
      },
      async remove(node) {
        if (!window.confirm('Delete this comment and its replies?')) return;
        try {
          const res = await api.del(`/comments/${node._id}`);
          const gone = new Set(res.deleted);
          setComments((prev) => prev.filter((c) => !gone.has(c._id)));
          onCountChange?.(-res.deleted.length);
        } catch (err) {
          window.alert(err.message);
        }
      },
      async like(node) {
        if (!user) return;
        const patch = (liked, likesCount) =>
          setComments((prev) => prev.map((c) => (c._id === node._id ? { ...c, likedByMe: liked, likesCount } : c)));
        patch(!node.likedByMe, node.likesCount + (node.likedByMe ? -1 : 1)); // optimistic
        try {
          const res = await api.post(`/comments/${node._id}/like`);
          patch(res.liked, res.likesCount);
        } catch {
          patch(node.likedByMe, node.likesCount);
        }
      },
    }),
    [postId, postAuthorId, user, onCountChange]
  );

  return (
    <section className="comments" aria-label="Comments">
      {user ? (
        <CommentBox
          placeholder="Add a comment"
          submitLabel="Comment"
          onSubmit={(text) => ctx.add(text, null)}
        />
      ) : (
        <p className="state-inline">
          <Link to="/login">Log in</Link> to join the conversation.
        </p>
      )}

      {!loaded ? <p className="list-end muted">Loading comments…</p> : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {loaded && !error && tree.length === 0 ? <p className="state-inline">No comments yet. Start the conversation.</p> : null}

      {tree.map((node) => (
        <CommentNode key={node._id} node={node} depth={0} ctx={ctx} />
      ))}
    </section>
  );
}
