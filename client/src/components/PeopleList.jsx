import UserRow from './UserRow.jsx';
import { InfiniteSentinel } from './PostList.jsx';

/** Renders a useInfiniteList() result of users (followers / following). */
export default function PeopleList({ list, empty }) {
  const { items, loaded, loading, error, hasMore, loadMore, refresh } = list;

  if (!loaded && !error) return <p className="list-end muted">Loading…</p>;
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
      <div className="people">
        {items.map((p) => (
          <UserRow key={p._id} person={p} />
        ))}
      </div>
      <InfiniteSentinel onVisible={loadMore} disabled={!hasMore || loading} />
      {loading ? <p className="list-end muted">Loading…</p> : null}
    </>
  );
}
