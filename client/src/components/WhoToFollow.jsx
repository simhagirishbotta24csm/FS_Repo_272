import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import UserRow from './UserRow.jsx';

export default function WhoToFollow() {
  const { user } = useAuth();
  const [people, setPeople] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    api
      .get('/users/suggestions')
      .then((data) => alive && setPeople(data.items))
      .catch(() => alive && setPeople([]));
    return () => {
      alive = false;
    };
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !people || people.length === 0) return null;
  return (
    <section className="widget" aria-label="People to follow">
      <h2 className="widget-title">People to follow</h2>
      {people.map((p) => (
        <UserRow key={p._id} person={p} compact />
      ))}
    </section>
  );
}
