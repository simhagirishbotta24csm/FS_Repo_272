import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import FollowButton from './FollowButton.jsx';

export default function UserRow({ person, compact = false }) {
  return (
    <div className="user-row">
      <Link to={`/u/${person.username}`} className="user-row-avatar" tabIndex={-1}>
        <Avatar user={person} size={compact ? 38 : 46} />
      </Link>
      <div className="user-row-body">
        <Link to={`/u/${person.username}`} className="user-row-name">
          {person.displayName || person.username}
        </Link>
        <span className="muted">@{person.username}</span>
        {!compact && person.bio ? <p className="user-row-bio">{person.bio}</p> : null}
        {person.mutualFollowers > 0 ? (
          <span className="user-row-note">
            Followed by {person.mutualFollowers} {person.mutualFollowers === 1 ? 'person' : 'people'} you follow
          </span>
        ) : null}
      </div>
      {!person.isMe ? <FollowButton target={person} small /> : null}
    </div>
  );
}
