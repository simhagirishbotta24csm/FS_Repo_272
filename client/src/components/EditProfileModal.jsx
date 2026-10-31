import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Avatar from './Avatar.jsx';

export default function EditProfileModal({ profile, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!picked.type.startsWith('image/')) return setError('Choose an image file.');
    if (picked.size > 4 * 1024 * 1024) return setError('That image is over 4MB. Pick a smaller one.');
    setError('');
    setFile(picked);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('displayName', displayName);
      body.append('bio', bio);
      if (file) body.append('avatar', file);
      const updated = await api.patch('/users/me', body);
      onSaved(updated);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <h2 id="edit-title">Edit profile</h2>

        <div className="avatar-edit">
          <Avatar user={{ ...profile, avatar: preview || profile.avatar }} size={72} />
          <label className="btn btn-outline btn-sm">
            Change photo
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={pick} hidden />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Name</span>
          <input value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Bio</span>
          <textarea value={bio} maxLength={160} rows={3} onChange={(e) => setBio(e.target.value)} />
          <span className="field-hint">{160 - bio.length} characters left</span>
        </label>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-solid" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
