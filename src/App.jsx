import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from './context/AppContext';
import { getSprint } from './lib/todos';
import LoginPage from './components/LoginPage';
import CalendarPage from './components/CalendarPage';
import BoardPage from './components/BoardPage';
import AdminPage from './components/AdminPage';

/* ── Route guards ─────────────────────────────────────── */
function RequireAuth({ children }) {
  const { user } = useApp();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return children;
}

function RequireSprint({ children }) {
  const { sprint } = useApp();
  if (!sprint) return <Navigate to="/" replace />;
  return children;
}

/* ── Animated page wrapper ─────────────────────────────── */
function Page({ k, children }) {
  return (
    <motion.div key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      {children}
    </motion.div>
  );
}

function App() {
  const { user, setSprint } = useApp();
  const navigate = useNavigate();

  // Handle ?share=username__sprintId deep link
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const share = params.get('share');
    if (!share) return;
    const sepIdx = share.indexOf('__');
    if (sepIdx === -1) return;
    const username = share.substring(0, sepIdx);
    const sprintId = share.substring(sepIdx + 2);
    getSprint(username, sprintId).then(s => {
      if (s) {
        setSprint(s);
        navigate('/board', { replace: true });
        const url = new URL(window.location.href);
        url.searchParams.delete('share');
        window.history.replaceState({}, '', url.toString());
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public */}
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <Page k="login"><LoginPage /></Page>
        } />

        {/* Calendar (home) */}
        <Route path="/" element={
          <RequireAuth>
            <Page k="calendar"><CalendarPage /></Page>
          </RequireAuth>
        } />

        {/* Board — needs an active sprint */}
        <Route path="/board" element={
          <RequireAuth>
            <RequireSprint>
              <Page k="board"><BoardPage /></Page>
            </RequireSprint>
          </RequireAuth>
        } />

        {/* Admin — needs isAdmin flag */}
        <Route path="/admin" element={
          <RequireAdmin>
            <Page k="admin"><AdminPage /></Page>
          </RequireAdmin>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;

