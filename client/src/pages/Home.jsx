import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import PostComposer from '../components/PostComposer.jsx';
import PostList from '../components/PostList.jsx';
import { useInfiniteList } from '../hooks/useInfiniteList.js';

const ZERO_ID = '000000000000000000000000';
const POLL_MS = 30_000;

export default function Home() {
  const list = useInfiniteList('/posts/feed');
  const { setItems, refresh } = list;
  const [newCount, setNewCount] = useState(0);
  const newestId = list.items[0]?._id || ZERO_ID;

  // Dynamic feed: quietly check for newer posts from people I follow.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await api.get(`/posts/feed/new?after=${newestId}`);
        setNewCount(res.count);
      } catch {
        /* a failed poll is not worth interrupting anyone for */
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [newestId]);

  const showNew = useCallback(() => {
    setNewCount(0);
    refresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [refresh]);

  const onPosted = useCallback((post) => setItems((prev) => [post, ...prev]), [setItems]);
  const onDeleted = useCallback((id) => setItems((prev) => prev.filter((p) => p._id !== id)), [setItems]);

  return (
    <>
      <header className="page-head">
        <h1>Home</h1>
      </header>
      <PostComposer onPosted={onPosted} />
      {newCount > 0 ? (
        <button type="button" className="new-posts" onClick={showNew}>
          Show {newCount >= 99 ? '99+' : newCount} new {newCount === 1 ? 'post' : 'posts'}
        </button>
      ) : null}
      <PostList
        list={list}
        onDeleted={onDeleted}
        empty={
          <>
            <h2>Your feed is empty</h2>
            <p>Follow a few people and their posts will show up here.</p>
            <Link to="/explore" className="btn btn-solid">
              Find people on Explore
            </Link>
          </>
        }
      />
    </>
  );
}
