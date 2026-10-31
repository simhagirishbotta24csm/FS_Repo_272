import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import SearchBox from './SearchBox.jsx';
import WhoToFollow from './WhoToFollow.jsx';
import { BrandMark, IconCompass, IconHome, IconLogout, IconUser } from './Icons.jsx';

const linkClass = ({ isActive }) => `rail-link${isActive ? ' active' : ''}`;

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <nav className="rail" aria-label="Main">
        <Link to="/" className="brand" aria-label="murmur home">
          <BrandMark />
          <span className="rail-label brand-word">murmur</span>
        </Link>

        <ul className="rail-nav">
          {user ? (
            <li>
              <NavLink to="/" end className={linkClass}>
                <IconHome />
                <span className="rail-label">Home</span>
              </NavLink>
            </li>
          ) : null}
          <li>
            <NavLink to="/explore" className={linkClass}>
              <IconCompass />
              <span className="rail-label">Explore</span>
            </NavLink>
          </li>
          {user ? (
            <li>
              <NavLink to={`/u/${user.username}`} className={linkClass}>
                <IconUser />
                <span className="rail-label">Profile</span>
              </NavLink>
            </li>
          ) : null}
        </ul>

        <div className="rail-foot">
          {user ? (
            <>
              <Link to={`/u/${user.username}`} className="user-chip">
                <Avatar user={user} size={36} />
                <span className="rail-label user-chip-text">
                  <strong>{user.displayName || user.username}</strong>
                  <span className="muted">@{user.username}</span>
                </span>
              </Link>
              <button type="button" className="rail-link as-button" onClick={logout}>
                <IconLogout />
                <span className="rail-label">Log out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn-solid">
                Sign up
              </Link>
              <Link to="/login" className="btn btn-outline">
                Log in
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="main">
        {!user ? (
          <div className="guest-bar show-mobile">
            <Link to="/login" className="btn btn-outline btn-sm">
              Log in
            </Link>
            <Link to="/register" className="btn btn-solid btn-sm">
              Sign up
            </Link>
          </div>
        ) : null}
        <Outlet />
      </main>

      <aside className="side">
        <SearchBox />
        <WhoToFollow />
      </aside>
    </div>
  );
}
