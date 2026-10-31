import { Link } from 'react-router-dom';

// Splitting on a capturing group yields [text, token, text, token, ...].
const TOKEN = /(@[a-zA-Z0-9_]{3,20}|#[\p{L}\p{N}_]+|https?:\/\/[^\s<]+)/gu;

/** Turns @mentions, #hashtags and links in plain text into React nodes (no innerHTML). */
export function renderRichText(text) {
  return text.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.startsWith('@')) {
      return (
        <Link key={i} to={`/u/${part.slice(1).toLowerCase()}`} className="mention">
          {part}
        </Link>
      );
    }
    if (part.startsWith('#')) {
      return (
        <span key={i} className="hashtag">
          {part}
        </span>
      );
    }
    return (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="ext-link">
        {part}
      </a>
    );
  });
}
