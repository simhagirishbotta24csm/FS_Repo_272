import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Explore from './pages/Explore.jsx';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';
import PostDetail from './pages/PostDetail.jsx';
import Profile from './pages/Profile.jsx';

// Signed-in people land on their feed; guests land on Explore.
function Index() {
  const { user } = useAuth();
  return user ? <Home /> : <Navigate to="/explore" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<Layout />}>
        <Route index element={<Index />} />
        <Route path="explore" element={<Explore />} />
        <Route path="u/:username" element={<Profile />} />
        <Route path="post/:id" element={<PostDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
