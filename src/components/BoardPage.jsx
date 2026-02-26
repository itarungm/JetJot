import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday } from 'date-fns';
import {
  ArrowLeft, Zap, LogOut, Pencil, Check, X,
  LayoutDashboard, TrendingUp, CalendarCheck,
  Share2, Sun, Moon, CheckCircle2, RotateCcw, ChevronLeft, ChevronRight, Map, Bell, ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import DayColumn from './DayColumn';
import Footer from './Footer';
import MapView from './MapView';

function ProgressSummary({ sprint }) {
  const days   = Object.keys(sprint.days).sort();
  const totals = days.reduce((acc, d) => {
    const todos = sprint.days[d] || [];
    acc.total += todos.length;
    acc.done  += todos.filter(t => t.completed).length;
    return acc;
  }, { total: 0, done: 0 });

  const pct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm">
        <TrendingUp className="w-4 h-4 text-brand-500" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {totals.done}/{totals.total}
          <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">tasks done</span>
        </span>
      </div>
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm min-w-[140px]">
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Sprint progress</span>
            <span className="text-xs font-bold text-brand-600">{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-400 to-violet-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {days.length} <span className="font-semibold text-gray-800 dark:text-gray-200">days</span>
        </span>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { user, sprint, renameSprint, logout, darkMode, toggleDarkMode, undoToast, undoRecurring, dismissUndoToast, weather, requestNotifications } = useApp();
  const navigate = useNavigate();
  const [editName, setEditName]     = useState(false);
  const [nameInput, setNameInput]   = useState(sprint?.name || '');
  const [shareToast, setShareToast] = useState(false);
  const [showMap, setShowMap]       = useState(false);
  const [activeDayIdx, setActiveDayIdx] = useState(0); // for mobile dot indicator
  const scrollRef                   = useRef(null);
  const dayRefs                     = useRef({});
  const touchStartX                 = useRef(0);
  const touchStartScroll            = useRef(0);
  const isSwiping                   = useRef(false);

  if (!sprint) return null;

  const days       = Object.keys(sprint.days).sort();
  const todayStr   = format(new Date(), 'yyyy-MM-dd');
  const todayInSprint = days.includes(todayStr);

  // Auto-scroll to today's column on mount
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!todayInSprint) return;
    const timer = setTimeout(() => scrollToToday(), 350); // wait for animations
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToToday = () => {
    const el = dayRefs.current[todayStr];
    const container = scrollRef.current;
    if (!el || !container) return;
    const elLeft     = el.offsetLeft;
    const elWidth    = el.offsetWidth;
    const containerW = container.offsetWidth;
    container.scrollTo({
      left:     elLeft - (containerW / 2) + (elWidth / 2),
      behavior: 'smooth',
    });
  };

  const scrollToDay = useCallback((idx) => {
    const date = days[Math.max(0, Math.min(days.length - 1, idx))];
    if (!date) return;
    const el = dayRefs.current[date];
    const container = scrollRef.current;
    if (!el || !container) return;
    container.scrollTo({
      left: el.offsetLeft - (container.offsetWidth / 2) + (el.offsetWidth / 2),
      behavior: 'smooth',
    });
  }, [days]);

  // Update activeDayIdx on scroll
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const mid = container.scrollLeft + container.offsetWidth / 2;
    let closestIdx = 0;
    let minDist = Infinity;
    days.forEach((date, i) => {
      const el = dayRefs.current[date];
      if (!el) return;
      const elMid = el.offsetLeft + el.offsetWidth / 2;
      const dist  = Math.abs(elMid - mid);
      if (dist < minDist) { minDist = dist; closestIdx = i; }
    });
    setActiveDayIdx(closestIdx);
  }, [days]);

  // Touch swipe handlers for mobile day navigation
  const handleTouchStart = useCallback((e) => {
    touchStartX.current     = e.touches[0].clientX;
    touchStartScroll.current = scrollRef.current?.scrollLeft || 0;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const diff = Math.abs(e.touches[0].clientX - touchStartX.current);
    if (diff > 10) isSwiping.current = true;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!isSwiping.current) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const THRESHOLD = 40;
    if (Math.abs(diff) < THRESHOLD) return;
    const direction = diff > 0 ? 1 : -1;
    setActiveDayIdx(prev => {
      const next = Math.max(0, Math.min(days.length - 1, prev + direction));
      setTimeout(() => scrollToDay(next), 0);
      return next;
    });
  }, [days, scrollToDay]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${user.username}__${sprint.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  const saveName = () => {
    if (nameInput.trim()) renameSprint(nameInput.trim());
    setEditName(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* ── Undo recurring toast ── */}
      <AnimatePresence>
        {undoToast && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3
              px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
              rounded-2xl shadow-2xl border border-white/10 dark:border-gray-300"
          >
            <RotateCcw className="w-4 h-4 text-violet-400 dark:text-violet-600 flex-shrink-0" />
            <span className="text-sm font-medium">
              Added to <span className="font-bold text-violet-300 dark:text-violet-700">{undoToast.dayCount} days</span>
            </span>
            <button
              onClick={undoRecurring}
              className="ml-1 px-3 py-1 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold transition-colors"
            >
              Undo
            </button>
            <button
              onClick={dismissUndoToast}
              className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share toast */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-xl text-sm font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            Share link copied!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 py-3 shadow-sm">
        <div className="max-w-full mx-auto flex items-center justify-between gap-4">

          {/* Left: logo + back */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-brand-600 transition-colors text-sm font-medium p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-violet-600 rounded-lg flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white hidden sm:block">Jet<span className="text-brand-500">Jot</span></span>
            </div>
          </div>

          {/* Center: sprint name */}
          <div className="flex-1 flex justify-center min-w-0 px-2">
            <AnimatePresence mode="wait">
              {editName ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 w-full max-w-sm"
                >
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditName(false); }}
                    className="input-field py-1.5 text-sm text-center"
                  />
                  <button onClick={saveName} className="p-1.5 rounded-lg bg-brand-50 text-brand-500 hover:bg-brand-100 flex-shrink-0">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditName(false)} className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="name"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => { setNameInput(sprint.name); setEditName(true); }}
                  className="flex items-center gap-1.5 group max-w-full"
                >
                  <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                    {sprint.name}
                  </span>
                  <Pencil className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Right: user + logout */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-3 py-1.5 rounded-full text-xs font-semibold">
              <div className="w-2 h-2 bg-brand-500 rounded-full" />
              {user?.username}
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-brand-600 transition-colors p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30"
              title="Copy share link"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {/* Notification bell */}
            <button
              onClick={requestNotifications}
              title="Enable todo reminders"
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-500 transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>
            {/* Admin shortcut */}
            {user?.isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                title="Admin dashboard"
                className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-800/40 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-gray-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Sub-header: sprint dates + progress */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 py-3">
        <div className="max-w-full mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-brand-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {format(parseISO(sprint.startDate), 'MMM d')}
                {' → '}
                {format(parseISO(sprint.endDate), 'MMM d, yyyy')}
              </span>
            </div>
            {todayInSprint && (
              <button
                onClick={scrollToToday}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600
                  bg-brand-50 hover:bg-brand-100 border border-brand-200
                  px-2.5 py-1 rounded-full transition-all"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                Jump to Today
              </button>
            )}
            {/* Map View button */}
            <button
              onClick={() => setShowMap(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600
                bg-emerald-50 hover:bg-emerald-100 border border-emerald-200
                dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400
                px-2.5 py-1 rounded-full transition-all"
            >
              <Map className="w-3.5 h-3.5" />
              Travel Map
            </button>
          </div>
          <ProgressSummary sprint={sprint} />
        </div>
      </div>

      {/* Board — touch-enabled horizontal scroller */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-x-auto px-4 sm:px-6 py-6"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex gap-4 pb-4 min-w-max mx-auto"
        >
          {days.map((date, i) => (
            <motion.div
              key={date}
              ref={el => { dayRefs.current[date] = el; }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              <DayColumn
                date={date}
                todos={sprint.days[date] || []}
                dayLog={(sprint.travelLog || {})[date]}
                weather={weather[date]}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Mobile day navigation bar ── */}
      {days.length > 1 && (
        <div className="sm:hidden flex items-center justify-center gap-3 py-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => { const next = Math.max(0, activeDayIdx - 1); setActiveDayIdx(next); scrollToDay(next); }}
            disabled={activeDayIdx === 0}
            className="p-1.5 rounded-lg text-gray-400 disabled:opacity-30 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dot indicators — show up to 9, with ellipsis for longer sprints */}
          <div className="flex items-center gap-1">
            {days.length <= 9 ? (
              days.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveDayIdx(i); scrollToDay(i); }}
                  className={`rounded-full transition-all duration-200 ${
                    i === activeDayIdx
                      ? 'w-4 h-2 bg-brand-500'
                      : days[i] === todayStr
                        ? 'w-2 h-2 bg-violet-400'
                        : 'w-2 h-2 bg-gray-200 dark:bg-gray-600'
                  }`}
                />
              ))
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold min-w-[60px] text-center">
                {format(parseISO(days[activeDayIdx]), 'MMM d')}
              </span>
            )}
          </div>

          <button
            onClick={() => { const next = Math.min(days.length - 1, activeDayIdx + 1); setActiveDayIdx(next); scrollToDay(next); }}
            disabled={activeDayIdx === days.length - 1}
            className="p-1.5 rounded-lg text-gray-400 disabled:opacity-30 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <Footer />

      {/* ── Travel Map overlay ── */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <MapView
              travelLog={sprint.travelLog || {}}
              days={days}
              darkMode={darkMode}
              onClose={() => setShowMap(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
