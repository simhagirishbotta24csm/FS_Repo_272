import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import PostComposer from '../components/PostComposer.jsx';
import PostList from '../components/PostList.jsx';
import SearchBox from '../components/SearchBox.jsx';
import { useInfiniteList } from '../hooks/useInfiniteList.js';

export default function Explore() {
  const { user } = useAuth();
  const list = useInfiniteList('/posts/explore');
  const { setItems } = list;

  const onPosted = useCallback((post) => setItems((prev) => [post, ...prev]), [setItems]);
  const onDeleted = useCallback((id) => setItems((prev) => prev.filter((p) => p._id !== id)), [setItems]);

  return (
    <>
      <header className="page-head">
        <h1>Explore</h1>
      </header>
      {/* The sidebar search is hidden on narrow screens, so repeat it here. */}
      <div className="show-no-side search-inline">
        <SearchBox />
      </div>
      {user ? <PostComposer onPosted={onPosted} /> : null}
      <PostList
        list={list}
        onDeleted={onDeleted}
        empty={
          <>
            <h2>Nothing posted yet</h2>
            <p>Be the first to post something.</p>
          </>
        }
      />
    </>
  );
}
