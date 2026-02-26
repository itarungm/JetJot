import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Users, Zap, LogOut, Loader2, RefreshCw,
  Trash2, Ban, CheckCircle2, ChevronDown, ChevronUp,
  UserCheck, UserX, Crown, AlertTriangle, Search,
  Activity, Calendar, BarChart3, X, ShieldAlert, ArrowLeft,
} from 'lucide-react';
import {
  getAllUsers,
  getSprintCountsByUser,
  setUserDisabled,
  deleteUserAccount,
} from '../lib/admin';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import Footer from './Footer';

/* ─── tiny helpers ──────────────────────────────────── */
function Badge({ color, children }) {
  const cls = {
    green:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    red:    'bg-red-100 text-red-700 border-red-200',
    blue:   'bg-blue-100 text-blue-700 border-blue-200',
    amber:  'bg-amber-100 text-amber-700 border-amber-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    gray:   'bg-gray-100 text-gray-500 border-gray-200',
  }[color] ?? 'bg-gray-100 text-gray-500 border-gray-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const ring = { blue: 'text-blue-600', green: 'text-emerald-500', amber: 'text-amber-500', purple: 'text-purple-500' }[color] ?? 'text-brand-600';
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 shadow-sm">
      <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-700 ${ring}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ─── ConfirmModal ──────────────────────────────────── */
function ConfirmModal({ open, title, message, confirmLabel, danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
      >
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={22} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── UserRow ───────────────────────────────────────── */
function UserRow({ user: u, sprintCount, currentUser, onDisable, onDelete, onToggleAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const isSelf = u.username === currentUser;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors select-none"
        onClick={() => setExpanded(p => !p)}
      >
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0
          ${u.disabled ? 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
            : u.isAdmin ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
            : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'}`}>
          {u.username[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-white truncate">{u.username}</span>
            {isSelf && <Badge color="blue">You</Badge>}
            {u.isAdmin && <Badge color="purple"><Crown size={10} /> Admin</Badge>}
            {u.disabled && <Badge color="red"><Ban size={10} /> Disabled</Badge>}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {u.createdAt ? `Joined ${new Date(u.createdAt).toLocaleDateString()}` : 'Unknown join date'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Zap size={12} className="text-brand-500" />
            <span>{sprintCount ?? 0} sprint{sprintCount !== 1 ? 's' : ''}</span>
          </div>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-wrap gap-2">
              {/* Sprint count (mobile) */}
              <div className="sm:hidden flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mr-auto">
                <Zap size={12} className="text-brand-500" />
                <span>{sprintCount ?? 0} sprint{sprintCount !== 1 ? 's' : ''}</span>
              </div>

              {/* Toggle disabled */}
              {!isSelf && (
                <button
                  onClick={() => onDisable(u.username, !u.disabled)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                    ${u.disabled
                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/30'
                      : 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/30'}`}
                >
                  {u.disabled ? <><UserCheck size={12} /> Enable</> : <><UserX size={12} /> Disable</>}
                </button>
              )}

              {/* Toggle admin */}
              {!isSelf && (
                <button
                  onClick={() => onToggleAdmin(u.username, !u.isAdmin)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <Crown size={12} />
                  {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                </button>
              )}

              {/* Delete */}
              {!isSelf && (
                <button
                  onClick={() => onDelete(u.username)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30 transition-colors ml-auto"
                >
                  <Trash2 size={12} /> Delete Account
                </button>
              )}

              {isSelf && (
                <p className="text-xs text-gray-400 italic">You cannot modify your own account.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── SprintRow ─────────────────────────────────────── */
function SprintRow({ username, count }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-400">
          {username[0].toUpperCase()}
        </div>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{username}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 rounded-full bg-brand-200 dark:bg-brand-900/50 overflow-hidden" style={{ width: `${Math.min(count * 18, 100)}px` }}>
          <div className="h-full bg-brand-500 rounded-full" style={{ width: '100%' }} />
        </div>
        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400 w-4 text-right">{count}</span>
      </div>
    </div>
  );
}

/* ─── AdminPage ─────────────────────────────────────── */
export default function AdminPage() {
  const { user, logout, darkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();

  const [users, setUsers]           = useState([]);
  const [sprintMap, setSprintMap]   = useState({});
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // username being acted on
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all'); // 'all' | 'active' | 'disabled' | 'admin'
  const [activeTab, setActiveTab]   = useState('users'); // 'users' | 'sprints'

  // Confirm modal state
  const [confirm, setConfirm] = useState(null);
  // { type: 'disable'|'enable'|'delete'|'admin'|'unadmin', username, value }

  /* ── data load ─────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [all, counts] = await Promise.all([getAllUsers(), getSprintCountsByUser()]);
      setUsers(all);
      setSprintMap(counts);
    } catch (e) {
      setError(e.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── derived stats ─────────────────────────────────── */
  const totalSprints  = Object.values(sprintMap).reduce((a, b) => a + b, 0);
  const disabledCount = users.filter(u => u.disabled).length;
  const adminCount    = users.filter(u => u.isAdmin).length;

  /* ── filtered users ────────────────────────────────── */
  const filtered = users.filter(u => {
    const matchSearch = u.username.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all'      ? true :
      filter === 'active'   ? !u.disabled :
      filter === 'disabled' ? u.disabled :
      filter === 'admin'    ? u.isAdmin : true;
    return matchSearch && matchFilter;
  });

  /* ── sorted sprint leaderboard ─────────────────────── */
  const sprintLeaderboard = Object.entries(sprintMap)
    .sort(([, a], [, b]) => b - a);

  /* ── actions ───────────────────────────────────────── */
  const handleDisable = (username, disabled) => {
    setConfirm({
      type: disabled ? 'disable' : 'enable',
      username,
      value: disabled,
    });
  };

  const handleDelete = (username) => {
    setConfirm({ type: 'delete', username });
  };

  const handleToggleAdmin = (username, makeAdmin) => {
    setConfirm({
      type: makeAdmin ? 'admin' : 'unadmin',
      username,
      value: makeAdmin,
    });
  };

  const executeConfirm = async () => {
    if (!confirm) return;
    const { type, username, value } = confirm;
    setConfirm(null);
    setActionLoading(username);
    try {
      if (type === 'disable' || type === 'enable') {
        await setUserDisabled(username, value);
        setUsers(prev => prev.map(u => u.username === username ? { ...u, disabled: value } : u));
      } else if (type === 'delete') {
        await deleteUserAccount(username);
        setUsers(prev => prev.filter(u => u.username !== username));
        setSprintMap(prev => { const m = { ...prev }; delete m[username]; return m; });
      } else if (type === 'admin' || type === 'unadmin') {
        await updateDoc(doc(db, 'users', username), { isAdmin: value });
        setUsers(prev => prev.map(u => u.username === username ? { ...u, isAdmin: value } : u));
      }
    } catch (e) {
      setError(e.message || 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  /* ── confirm modal config ──────────────────────────── */
  const confirmConfig = confirm ? {
    disable:  { title: 'Disable Account',    message: `Disable @${confirm.username}? They won't be able to log in.`,                   confirmLabel: 'Disable', danger: true },
    enable:   { title: 'Enable Account',     message: `Re-enable @${confirm.username}? They'll be able to log in again.`,              confirmLabel: 'Enable',  danger: false },
    delete:   { title: 'Delete Account',     message: `Permanently delete @${confirm.username} and all their sprints? This cannot be undone.`, confirmLabel: 'Delete',  danger: true },
    admin:    { title: 'Grant Admin Access', message: `Make @${confirm.username} an admin? They'll have full admin panel access.`,     confirmLabel: 'Grant',   danger: false },
    unadmin:  { title: 'Revoke Admin Access',message: `Revoke admin access from @${confirm.username}?`,                               confirmLabel: 'Revoke',  danger: true },
  }[confirm?.type] : null;

  /* ── render ────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Confirm modal */}
      <AnimatePresence>
        {confirm && confirmConfig && (
          <ConfirmModal
            open={true}
            title={confirmConfig.title}
            message={confirmConfig.message}
            confirmLabel={confirmConfig.confirmLabel}
            danger={confirmConfig.danger}
            onConfirm={executeConfirm}
            onCancel={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors mr-1"
              title="Back to my sprints"
            >
              <ArrowLeft size={13} /> Back
            </button>
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ShieldCheck size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-sm">Admin Panel</span>
            <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500">· JetJot</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Toggle theme"
            >
              {darkMode
                ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              }
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}

        {/* Welcome */}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Welcome, <span className="text-purple-600 dark:text-purple-400">@{user?.username}</span>
          </h1>
          <Badge color="purple"><Crown size={10} /> Admin</Badge>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Users}       label="Total Users"     value={users.length}   color="blue" />
            <StatCard icon={Activity}    label="Active Users"    value={users.length - disabledCount} color="green" />
            <StatCard icon={Zap}         label="Total Sprints"   value={totalSprints}   color="amber" />
            <StatCard icon={ShieldCheck} label="Admins"          value={adminCount}     color="purple" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          {[
            { id: 'users',   label: 'Users',   icon: Users },
            { id: 'sprints', label: 'Sprints', icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeTab === id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── Users Tab ── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600"
                />
              </div>

              {/* Filter pills */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { id: 'all',      label: 'All' },
                  { id: 'active',   label: 'Active' },
                  { id: 'disabled', label: 'Disabled' },
                  { id: 'admin',    label: 'Admins' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                      ${filter === id
                        ? 'bg-purple-600 text-white border-transparent'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* User list */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                <Users size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No users found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Showing {filtered.length} of {users.length} users
                  {actionLoading && <span className="ml-2 inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Updating…</span>}
                </p>
                {filtered.map(u => (
                  <UserRow
                    key={u.username}
                    user={u}
                    sprintCount={sprintMap[u.username] ?? 0}
                    currentUser={user?.username}
                    onDisable={handleDisable}
                    onDelete={handleDelete}
                    onToggleAdmin={handleToggleAdmin}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Sprints Tab ── */}
        {activeTab === 'sprints' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <BarChart3 size={15} className="text-brand-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Sprint Leaderboard</h2>
                <span className="ml-auto text-xs text-gray-400">{totalSprints} total</span>
              </div>

              {loading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : sprintLeaderboard.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                  <Zap size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No sprints yet.</p>
                </div>
              ) : (
                <div className="py-2">
                  {sprintLeaderboard.map(([username, count], idx) => (
                    <div key={username} className="flex items-center">
                      <span className="pl-4 pr-2 text-xs font-bold text-gray-300 dark:text-gray-600 w-10">
                        #{idx + 1}
                      </span>
                      <div className="flex-1">
                        <SprintRow username={username} count={count} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Per-user breakdown card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Calendar size={15} className="text-amber-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm">User Overview</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : users.map(u => (
                  <div key={u.username} className="flex items-center px-4 py-3 gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${u.disabled ? 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                        : u.isAdmin ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'}`}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{u.username}</span>
                    <div className="flex items-center gap-2">
                      {u.isAdmin && <Badge color="purple">Admin</Badge>}
                      {u.disabled && <Badge color="red">Disabled</Badge>}
                      <Badge color={sprintMap[u.username] > 0 ? 'amber' : 'gray'}>
                        <Zap size={10} /> {sprintMap[u.username] ?? 0}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
