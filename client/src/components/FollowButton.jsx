import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Optimistic follow / unfollow toggle.
 * `target` is a user object with `username` and `isFollowing`.
 * `onChange` receives the server response ({ isFollowing, followersCount, myFollowingCount }).
 */
export default function FollowButton({ target, onChange, small = false }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(Boolean(target.isFollowing));
  const [busy, setBusy] = useState(false);

  useEffect(() => setFollowing(Boolean(target.isFollowing)), [target.isFollowing]);

  async function toggle() {
    if (!user) return navigate('/login');
    if (busy) return;
    const next = !following;
    setBusy(true);
    setFollowing(next);
    try {
      const res = next
        ? await api.post(`/users/${target.username}/follow`)
        : await api.del(`/users/${target.username}/follow`);
      setFollowing(res.isFollowing);
      setUser((u) => (u ? { ...u, followingCount: res.myFollowingCount } : u));
      onChange?.(res);
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`btn follow-btn ${following ? 'btn-outline is-following' : 'btn-solid'}${small ? ' btn-sm' : ''}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
    >
      {following ? (
        <>
          <span className="when-idle">Following</span>
          <span className="when-hover">Unfollow</span>
        </>
      ) : (
        'Follow'
      )}
    </button>
  );
}
