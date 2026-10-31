import { useEffect, useRef } from 'react';
import PostCard from './PostCard.jsx';

export function InfiniteSentinel({ onVisible, disabled }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (disabled || !el) return undefined;
    // Re-created each time `disabled` flips, so it fires again if the sentinel
    // is still on screen after a page finishes loading.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible();
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [disabled, onVisible]);
  return <div ref={ref} className="sentinel" aria-hidden="true" />;
}

function SkeletonPost() {
  return (
    <div className="post skeleton-post" aria-hidden="true">
      <div className="skeleton circle" />
      <div className="post-main">
        <div className="skeleton line short" />
        <div className="skeleton line" />
        <div className="skeleton line mid" />
      </div>
    </div>
  );
}

/** Renders a useInfiniteList() result of posts, including loading / empty / error states. */
export default function PostList({ list, onDeleted, empty }) {
  const { items, loaded, loading, error, hasMore, loadMore, refresh } = list;

  if (!loaded && !error) {
    return (
      <>
        <SkeletonPost />
        <SkeletonPost />
        <SkeletonPost />
      </>
    );
  }
  if (error && items.length === 0) {
    return (
      <div className="state-box" role="alert">
        <p>{error}</p>
        <button type="button" className="btn btn-outline" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  }
  if (loaded && items.length === 0) return <div className="state-box">{empty}</div>;

  return (
    <>
      {items.filter((p) => p.author).map((post) => (
        <PostCard key={post._id} post={post} onDeleted={onDeleted} />
      ))}
      {error ? (
        <div className="state-box" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn-outline" onClick={loadMore}>
            Load more
          </button>
        </div>
      ) : null}
      <InfiniteSentinel onVisible={loadMore} disabled={!hasMore || loading} />
      {loading ? <p className="list-end muted">Loading…</p> : null}
      {!hasMore && !loading && !error ? <p className="list-end muted">You are all caught up.</p> : null}
    </>
  );
}
