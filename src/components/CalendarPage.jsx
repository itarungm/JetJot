import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateRangePicker } from 'react-date-range';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, parseISO, isPast, isToday, isFuture } from 'date-fns';
import {
  CalendarDays, ArrowRight, Zap, LogOut, Loader2, Pencil,
  History, Rocket, CheckCircle2, Clock, ChevronRight, RefreshCw, Trash2, Sun, Moon, ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getUserSprints, deleteSprint } from '../lib/todos';
import Footer from './Footer';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

function sprintStatus(startDate, endDate) {
  const start = parseISO(startDate);
  const end   = parseISO(endDate);
  if (isFuture(start))          return { label: 'Upcoming', color: 'text-blue-600 bg-blue-50 border-blue-200',    icon: Clock };
  if (isPast(end) && !isToday(end)) return { label: 'Completed', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 };
  return { label: 'Active',    color: 'text-brand-600 bg-brand-50 border-brand-200',  icon: Rocket };
}

function sprintProgress(sprint) {
  const todos = Object.values(sprint.days || {}).flat();
  const total = todos.length;
  const done  = todos.filter(t => t.completed).length;
  return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export default function CalendarPage() {
  const { user, logout, loadOrCreateSprint, loading, error, darkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();

  const [range, setRange]           = useState([{ startDate: new Date(), endDate: new Date(), key: 'selection' }]);
  const [sprintName, setSprintName] = useState('');
  const [sprints, setSprints]       = useState([]);
  const [sprintsLoading, setSprintsLoading] = useState(true);
  const [openingId, setOpeningId]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // sprintId being confirmed
  const [deleting, setDeleting]     = useState(null);       // sprintId being deleted

  const MAX_DAYS    = 60;
  const start       = range[0].startDate;
  const end         = range[0].endDate;
  const days        = differenceInDays(end, start) + 1;
  const isOverLimit = days > MAX_DAYS;
  const defaultName = `Sprint: ${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;

  // Load existing sprints on mount
  useEffect(() => {
    if (!user) return;
    setSprintsLoading(true);
    getUserSprints(user.username)
      .then(setSprints)
      .catch((err) => {
        // Firestore composite index not yet created — common first-run issue
        if (err.message?.includes('index') || err.code === 'failed-precondition') {
          console.warn('Firestore composite index needed. Check the console for a link to create it automatically.');
        }
        setSprints([]);
      })
      .finally(() => setSprintsLoading(false));
  }, [user]);

  const handleGo = () => {
    if (isOverLimit) return;
    loadOrCreateSprint(
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd'),
      sprintName.trim() || defaultName,
    ).then(s => { if (s) navigate('/board'); });
  };

  const refreshSprints = () => {
    getUserSprints(user.username).then(setSprints).catch(() => {});
  };

  const handleDeleteSprint = async (sprint, e) => {
    e.stopPropagation();
    if (deleteConfirm !== sprint.id) {
      setDeleteConfirm(sprint.id);
      return;
    }
    setDeleting(sprint.id);
    setDeleteConfirm(null);
    try {
      await deleteSprint(user.username, sprint.id);
      setSprints(prev => prev.filter(s => s.id !== sprint.id));
    } catch { /* silent */ }
    setDeleting(null);
  };

  const cancelDelete = (e, id) => {
    e.stopPropagation();
    if (deleteConfirm === id) setDeleteConfirm(null);
  };

  const openSprint = async (sprint) => {
    setOpeningId(sprint.id);
    const s = await loadOrCreateSprint(sprint.startDate, sprint.endDate, sprint.name);
    setOpeningId(null);
    if (s) navigate('/board');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-violet-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white">Jet<span className="text-brand-500">Jot</span></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-3 py-1.5 rounded-full text-sm font-semibold">
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
              {user?.username}
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-rose-500 transition-colors text-sm font-medium px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            {user?.isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                title="Admin dashboard"
                className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-800/40 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-12">

        {/* ── New Sprint Section ── */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4 border border-brand-100">
              <CalendarDays className="w-4 h-4" />
              New Sprint
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              When are you <span className="text-brand-500">hustling?</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-base">
              Select a date range — we&apos;ll create a day-by-day todo board for you.
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
            {/* Calendar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              <DateRangePicker
                ranges={range}
                onChange={item => setRange([item.selection])}
                moveRangeOnFirstSelection={false}
                months={window.innerWidth >= 768 ? 2 : 1}
                direction="horizontal"
                showMonthArrow
                rangeColors={['#6366f1']}
                minDate={new Date(2020, 0, 1)}
              />
            </motion.div>

            {/* Side panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="w-full lg:w-80 flex flex-col gap-4"
            >
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-2xl shadow-card border p-4 text-center transition-colors duration-200
                  ${isOverLimit ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                  <p className={`text-3xl font-bold ${isOverLimit ? 'text-rose-500' : 'text-brand-500'}`}>{days}</p>
                  <p className={`text-xs font-medium mt-1 ${isOverLimit ? 'text-rose-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {days === 1 ? 'Day' : 'Days'} Selected
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100 dark:border-gray-700 p-4 text-center">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{format(start, 'MMM d')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 my-0.5">to</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{format(end, 'MMM d')}</p>
                </div>
              </div>

              {/* Over-limit warning */}
              <AnimatePresence>
                {isOverLimit && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5"
                  >
                    <span className="text-rose-500 text-lg leading-none">⚠️</span>
                    <p className="text-xs text-rose-600 font-medium leading-snug">
                      Max sprint length is <strong>{MAX_DAYS} days</strong>. Please shorten your range
                      ({days - MAX_DAYS} day{days - MAX_DAYS !== 1 ? 's' : ''} over limit).
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sprint name */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100 dark:border-gray-700 p-4">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Sprint Name (optional)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={sprintName}
                    onChange={e => setSprintName(e.target.value)}
                    placeholder={defaultName}
                    className="input-field pr-10 text-sm"
                  />
                  <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-rose-500 text-sm text-center font-medium">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                onClick={handleGo}
                disabled={loading || isOverLimit}
                className="btn-primary flex items-center justify-center gap-2 text-base py-4"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Open Board <ArrowRight className="w-5 h-5" /></>)}
              </button>
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">Existing sprint? We&apos;ll load it automatically.</p>
            </motion.div>
          </div>
        </div>

        {/* ── Your Sprints Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Sprints</h2>
              {!sprintsLoading && sprints.length > 0 && (
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {sprints.length}
                </span>
              )}
            </div>
            <button
              onClick={refreshSprints}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-500 transition-colors font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {sprintsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse">
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-lg w-3/4 mb-3" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-lg w-1/2 mb-4" />
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full" />
                </div>
              ))}
            </div>
          ) : sprints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-600">
              <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/40 rounded-2xl flex items-center justify-center mb-3">
                <CalendarDays className="w-6 h-6 text-brand-400" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No sprints yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Pick dates above and open your first board!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sprints.map((sprint, i) => {
                const status   = sprintStatus(sprint.startDate, sprint.endDate);
                const progress = sprintProgress(sprint);
                const StatusIcon = status.icon;
                const isOpening  = openingId === sprint.id;
                const isDeleting = deleting === sprint.id;
                const isConfirming = deleteConfirm === sprint.id;
                return (
                  <motion.div
                    key={sprint.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative group"
                  >
                    <motion.button
                      onClick={() => !isDeleting && !isConfirming && openSprint(sprint)}
                      disabled={isOpening || isDeleting}
                      className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-card
                        hover:shadow-card-hover hover:border-brand-200 dark:hover:border-brand-700 transition-all duration-200
                        p-5 flex flex-col gap-3 relative overflow-hidden disabled:opacity-70"
                    >
                      {/* Hover glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-50/0 to-violet-50/0
                        group-hover:from-brand-50/60 group-hover:to-violet-50/40 dark:group-hover:from-brand-900/20 dark:group-hover:to-violet-900/10 transition-all duration-300 rounded-2xl" />

                      <div className="relative">
                        {/* Status + open arrow */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                          {isOpening
                            ? <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                            : <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                          }
                        </div>

                        {/* Sprint name */}
                        <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-snug mb-1 truncate">
                          {sprint.name}
                        </p>

                        {/* Date range */}
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                          {format(parseISO(sprint.startDate), 'MMM d')}
                          {' → '}
                          {format(parseISO(sprint.endDate), 'MMM d, yyyy')}
                          <span className="ml-1.5 text-gray-300 dark:text-gray-600">·</span>
                          <span className="ml-1.5">{differenceInDays(parseISO(sprint.endDate), parseISO(sprint.startDate)) + 1}d</span>
                        </p>

                        {/* Progress */}
                        <div className="mt-3">
                          <div className="flex justify-between mb-1.5">
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {progress.done}/{progress.total} tasks
                            </span>
                            <span className="text-xs font-bold text-brand-600">{progress.pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-brand-400 to-violet-500 rounded-full transition-all duration-500"
                              style={{ width: `${progress.pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.button>

                    {/* Delete button overlay */}
                    {isConfirming ? (
                      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                        <button
                          onClick={(e) => handleDeleteSprint(sprint, e)}
                          className="px-2 py-1 rounded-lg bg-rose-500 text-white text-xs font-bold shadow-lg"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => cancelDelete(e, sprint.id)}
                          className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold shadow-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDeleteSprint(sprint, e)}
                        disabled={isDeleting}
                        className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80
                          text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30
                          opacity-0 group-hover:opacity-100 transition-all shadow-sm
                          disabled:opacity-50"
                        title="Delete sprint"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

      </div>
      <Footer />
    </div>
  );
}
