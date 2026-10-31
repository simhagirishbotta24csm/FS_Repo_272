import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

/**
 * Cursor-paginated list. `path` is an API path that returns { items, nextCursor }.
 * Changing `path` resets the list. `loadMore` is safe to call repeatedly.
 */
export function useInfiniteList(path, { limit = 10 } = {}) {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const cursorRef = useRef(null);
  const busyRef = useRef(false);
  const generation = useRef(0); // lets us ignore responses from a stale path/refresh

  const reset = useCallback(() => {
    generation.current += 1;
    busyRef.current = false;
    cursorRef.current = null;
    setItems([]);
    setHasMore(true);
    setLoading(false);
    setLoaded(false);
    setError('');
  }, []);

  const loadMore = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const mine = generation.current;
    setLoading(true);
    setError('');
    try {
      const sep = path.includes('?') ? '&' : '?';
      const cursor = cursorRef.current ? `&cursor=${cursorRef.current}` : '';
      const data = await api.get(`${path}${sep}limit=${limit}${cursor}`);
      if (mine !== generation.current) return;
      setItems((prev) => [...prev, ...data.items]);
      cursorRef.current = data.nextCursor;
      setHasMore(Boolean(data.nextCursor));
    } catch (err) {
      if (mine === generation.current) {
        setError(err.message);
        setHasMore(false);
      }
    } finally {
      if (mine === generation.current) {
        busyRef.current = false;
        setLoading(false);
        setLoaded(true);
      }
    }
  }, [path, limit]);

  const refresh = useCallback(() => {
    reset();
    loadMore();
  }, [reset, loadMore]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, setItems, hasMore, loading, loaded, error, loadMore, refresh };
}
