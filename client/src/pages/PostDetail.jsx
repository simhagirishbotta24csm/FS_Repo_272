import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import CommentThread from '../components/CommentThread.jsx';
import { IconArrowLeft } from '../components/Icons.jsx';
import PostCard from '../components/PostCard.jsx';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setPost(null);
    setError('');
    api
      .get(`/posts/${id}`)
      .then((data) => alive && setPost(data))
      .catch((err) => alive && setError(err.status === 404 || err.status === 400 ? 'gone' : err.message));
    return () => {
      alive = false;
    };
  }, [id]);

  const onCountChange = useCallback(
    (delta) => setPost((p) => (p ? { ...p, commentsCount: Math.max(0, p.commentsCount + delta) } : p)),
    []
  );

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <>
      <header className="page-head">
        <button type="button" className="icon-btn" onClick={back} aria-label="Go back">
          <IconArrowLeft />
        </button>
        <h1>Post</h1>
      </header>

      {error === 'gone' ? (
        <div className="state-box">
          <h2>This post isn’t available</h2>
          <p>It may have been deleted by its author.</p>
          <Link to="/explore" className="btn btn-outline">
            Go to Explore
          </Link>
        </div>
      ) : error ? (
        <div className="state-box" role="alert">
          <p>{error}</p>
        </div>
      ) : !post ? (
        <p className="list-end muted">Loading post…</p>
      ) : (
        <>
          <PostCard post={post} detail onDeleted={() => navigate('/')} />
          <CommentThread postId={post._id} postAuthorId={post.author._id} onCountChange={onCountChange} />
        </>
      )}
    </>
  );
}
