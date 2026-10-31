import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar, { hueFor } from '../components/Avatar.jsx';
import EditProfileModal from '../components/EditProfileModal.jsx';
import FollowButton from '../components/FollowButton.jsx';
import PeopleList from '../components/PeopleList.jsx';
import PostList from '../components/PostList.jsx';
import { useInfiniteList } from '../hooks/useInfiniteList.js';

const TABS = [
  { id: 'posts', label: 'Posts', count: 'postsCount' },
  { id: 'followers', label: 'Followers', count: 'followersCount' },
  { id: 'following', label: 'Following', count: 'followingCount' },
];

function ProfileView({ username }) {
  const { user, setUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('posts');
  const [editing, setEditing] = useState(false);
  const list = useInfiniteList(`/users/${username}/${tab}`, { limit: 12 });
  const { setItems } = list;

  useEffect(() => {
    let alive = true;
    api
      .get(`/users/${username}`)
      .then((data) => alive && setProfile(data))
      .catch((err) => alive && setError(err.status === 404 ? 'notfound' : err.message));
    return () => {
      alive = false;
    };
  }, [username, user?._id]);

  const onDeleted = useCallback(
    (id) => {
      setItems((prev) => prev.filter((p) => p._id !== id));
      setProfile((p) => (p ? { ...p, postsCount: Math.max(0, p.postsCount - 1) } : p));
    },
    [setItems]
  );

  if (error === 'notfound') {
    return (
      <>
        <header className="page-head">
          <h1>Profile</h1>
        </header>
        <div className="state-box">
          <h2>@{username} doesn’t exist</h2>
          <p>Check the spelling, or search for the person you’re looking for.</p>
          <Link to="/explore" className="btn btn-outline">
            Go to Explore
          </Link>
        </div>
      </>
    );
  }
  if (error) {
    return (
      <div className="state-box" role="alert">
        <p>{error}</p>
      </div>
    );
  }
  if (!profile) return <p className="list-end muted">Loading profile…</p>;

  const hue = hueFor(profile.username);
  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <>
      <header className="page-head">
        <h1>{profile.displayName || profile.username}</h1>
        <span className="muted head-sub">{profile.postsCount} posts</span>
      </header>

      <section className="profile-head">
        <div
          className="profile-cover"
          style={{ background: `linear-gradient(120deg, hsl(${hue} 62% 46%), hsl(${(hue + 50) % 360} 70% 38%))` }}
        />
        <div className="profile-info">
          <div className="profile-top">
            <div className="profile-avatar">
              <Avatar user={profile} size={92} />
            </div>
            <div className="profile-actions">
              {profile.isMe ? (
                <>
                  <button type="button" className="btn btn-outline" onClick={() => setEditing(true)}>
                    Edit profile
                  </button>
                  <button type="button" className="btn btn-ghost show-mobile" onClick={logout}>
                    Log out
                  </button>
                </>
              ) : (
                <FollowButton
                  target={profile}
                  onChange={(res) =>
                    setProfile((p) => ({ ...p, isFollowing: res.isFollowing, followersCount: res.followersCount }))
                  }
                />
              )}
            </div>
          </div>

          <h2 className="profile-name">{profile.displayName || profile.username}</h2>
          <p className="muted profile-handle">
            @{profile.username}
            {profile.followsYou ? <span className="badge">Follows you</span> : null}
          </p>
          {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}
          <p className="muted profile-joined">Joined {joined}</p>
        </div>

        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <strong>{profile[t.count]}</strong> {t.label}
            </button>
          ))}
        </div>
      </section>

      {tab === 'posts' ? (
        <PostList
          list={list}
          onDeleted={onDeleted}
          empty={
            <>
              <h2>{profile.isMe ? 'You haven’t posted yet' : `@${profile.username} hasn’t posted yet`}</h2>
              {profile.isMe ? <p>Head to Home to share your first post.</p> : null}
            </>
          }
        />
      ) : (
        <PeopleList
          list={list}
          empty={
            <h2>
              {tab === 'followers'
                ? `No followers yet`
                : profile.isMe
                ? 'You aren’t following anyone yet'
                : `@${profile.username} isn’t following anyone yet`}
            </h2>
          }
        />
      )}

      {editing ? (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setProfile((p) => ({ ...p, displayName: updated.displayName, bio: updated.bio, avatar: updated.avatar }));
            setUser((u) => ({ ...u, displayName: updated.displayName, bio: updated.bio, avatar: updated.avatar }));
            setEditing(false);
          }}
        />
      ) : null}
    </>
  );
}

// Keyed by username so navigating between profiles resets all local state.
export default function Profile() {
  const { username } = useParams();
  return <ProfileView key={username} username={username.toLowerCase()} />;
}
