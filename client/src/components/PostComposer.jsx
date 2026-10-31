import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import { IconImage, IconX } from './Icons.jsx';

const MAX_CHARS = 280;
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function PostComposer({ onPosted, placeholder = 'Share something with your followers' }) {
  const { user, setUser } = useAuth();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef(null);
  const textarea = useRef(null);

  // Object URLs must be released or they leak.
  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const remaining = MAX_CHARS - text.length;
  const canPost = (text.trim().length > 0 || file) && remaining >= 0 && !busy;

  function autosize(el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  function pickFile(e) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    if (!TYPES.includes(picked.type)) return setError('Use a JPEG, PNG, GIF or WebP image.');
    if (picked.size > MAX_BYTES) return setError('That image is over 4MB. Pick a smaller one.');
    setError('');
    setFile(picked);
  }

  async function submit(e) {
    e?.preventDefault();
    if (!canPost) return;
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('text', text.trim());
      if (file) body.append('image', file);
      const post = await api.post('/posts', body);
      setText('');
      setFile(null);
      if (textarea.current) textarea.current.style.height = 'auto';
      setUser((u) => (u ? { ...u, postsCount: (u.postsCount || 0) + 1 } : u));
      onPosted?.(post);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <Avatar user={user} size={44} />
      <div className="composer-body">
        <textarea
          ref={textarea}
          className="composer-text"
          value={text}
          rows={2}
          placeholder={placeholder}
          aria-label="Post text"
          onChange={(e) => {
            setText(e.target.value);
            autosize(e.target);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e);
          }}
        />
        {preview ? (
          <div className="composer-preview">
            <img src={preview} alt="Selected upload preview" />
            <button type="button" className="icon-btn overlay" onClick={() => setFile(null)} aria-label="Remove image">
              <IconX size={16} />
            </button>
          </div>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="composer-tools">
          <input ref={fileInput} type="file" accept={TYPES.join(',')} onChange={pickFile} hidden />
          <button
            type="button"
            className="icon-btn"
            onClick={() => fileInput.current?.click()}
            aria-label="Add an image"
            title="Add an image"
          >
            <IconImage />
          </button>
          <span className={`counter${remaining < 0 ? ' over' : remaining <= 20 ? ' near' : ''}`}>
            {remaining <= 40 ? remaining : ''}
          </span>
          <button type="submit" className="btn btn-solid" disabled={!canPost}>
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
