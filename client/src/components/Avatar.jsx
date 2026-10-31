// Deterministic colour from the username so people keep the same fallback avatar.
export function hueFor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return hash;
}

export default function Avatar({ user, size = 44 }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (user?.avatar) {
    return <img className="avatar" src={user.avatar} alt="" style={style} loading="lazy" />;
  }
  const label = (user?.displayName || user?.username || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      className="avatar avatar-fallback"
      style={{ ...style, background: `hsl(${hueFor(user?.username)} 42% 38%)` }}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}
