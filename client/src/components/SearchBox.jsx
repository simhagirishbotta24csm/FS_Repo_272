import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Avatar from './Avatar.jsx';
import { IconSearch } from './Icons.jsx';

export default function SearchBox() {
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);

  // Debounced prefix search; the AbortController drops out-of-date responses.
  useEffect(() => {
    const q = value.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .get(`/users/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((data) => {
          setResults(data.items);
          setSearched(true);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  const showPanel = open && value.trim();

  return (
    <div
      className="search"
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <IconSearch size={18} />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Find people"
        aria-label="Find people"
      />
      {showPanel ? (
        // preventDefault on mousedown keeps focus in the input so clicks on results register
        <div className="search-results" onMouseDown={(e) => e.preventDefault()}>
          {results.map((p) => (
            <Link
              key={p._id}
              to={`/u/${p.username}`}
              className="search-hit"
              onClick={() => {
                setValue('');
                setOpen(false);
              }}
            >
              <Avatar user={p} size={34} />
              <span>
                <strong>{p.displayName || p.username}</strong>
                <span className="muted"> @{p.username}</span>
              </span>
            </Link>
          ))}
          {searched && results.length === 0 ? <p className="search-empty">No one matches “{value.trim()}”.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
