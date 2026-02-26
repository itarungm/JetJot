import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { Plus, Flag, Clock, RefreshCw, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import TodoItem from './TodoItem';
import DayTravelLog from './DayTravelLog';

const PRIORITY_OPTIONS = [
  { value: 'high',   label: '🔥 High',   color: 'text-rose-500'    },
  { value: 'medium', label: '⚡ Medium', color: 'text-amber-500'   },
  { value: 'low',    label: '✅ Low',    color: 'text-emerald-500' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DayColumn({ date, todos = [], dayLog, weather }) {
  const { addTodo, addRecurringTodo, reorderTodos } = useApp();

  const [inputText, setInputText]         = useState('');
  const [priority, setPriority]           = useState('medium');
  const [showInput, setShowInput]         = useState(false);
  const [adding, setAdding]               = useState(false);
  const [time, setTime]                   = useState('');
  const [recurring, setRecurring]         = useState(false);
  const [showTravelLog, setShowTravelLog] = useState(false);
  // Drag state
  const [draggedId, setDraggedId]         = useState(null);
  const [dragOverId, setDragOverId]       = useState(null);

  const normDayLog = dayLog || { locations: [], photo: null };

  const handleDragStart = (id) => (e) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnter = (id) => (e) => {
    e.preventDefault();
    if (id !== draggedId) setDragOverId(id);
  };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedId || !dragOverId || draggedId === dragOverId) {
      setDraggedId(null); setDragOverId(null); return;
    }
    const reordered = [...todos];
    const fromIdx = reordered.findIndex(t => t.id === draggedId);
    const toIdx   = reordered.findIndex(t => t.id === dragOverId);
    const [item]  = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, item);
    reorderTodos(date, reordered);
    setDraggedId(null); setDragOverId(null);
  };
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };


  const dateObj    = parseISO(date);
  const dayName    = DAY_LABELS[dateObj.getDay()];
  const dayNum     = format(dateObj, 'd');
  const monthYear  = format(dateObj, 'MMM yyyy');
  const isTodays   = isToday(dateObj);
  const isPastDay  = isPast(dateObj) && !isTodays;

  const completed  = todos.filter(t => t.completed).length;
  const total      = todos.length;
  const progress   = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAdd = async () => {
    if (!inputText.trim()) return;
    setAdding(true);
    const t = time || null;
    if (recurring) {
      await addRecurringTodo(date, inputText.trim(), priority, t);
    } else {
      await addTodo(date, inputText.trim(), priority, t);
    }
    setInputText('');
    setTime('');
    setRecurring(false);
    setAdding(false);
  };

  const handleCancel = () => {
    setShowInput(false);
    setInputText('');
    setTime('');
    setRecurring(false);
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') await handleAdd();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col min-w-[280px] sm:min-w-[300px] w-full max-w-xs
        bg-white dark:bg-gray-800 rounded-2xl border shadow-card flex-shrink-0
        ${isTodays ? 'border-brand-300 ring-2 ring-brand-200' : 'border-gray-100 dark:border-gray-700'}`}
    >
      {/* Header */}
      <div className={`px-4 pt-4 pb-3 rounded-t-2xl
        ${isTodays ? 'bg-gradient-to-br from-brand-500 to-violet-600' : 'bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700'}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-widest
              ${isTodays ? 'text-brand-100' : 'text-gray-400 dark:text-gray-400'}`}>
              {dayName}
              {isTodays && ' · Today'}
              {isPastDay && ' · Past'}
            </p>
            <div className="flex items-end gap-2 mt-0.5">
              <span className={`text-3xl font-bold leading-none
                ${isTodays ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                {dayNum}
              </span>
              <span className={`text-sm font-medium pb-0.5
                ${isTodays ? 'text-brand-200' : 'text-gray-400 dark:text-gray-500'}`}>
                {monthYear}
              </span>
              {/* weather badge */}
              {weather && (
                <span
                  title={`${weather.max}° / ${weather.min}°C`}
                  className={`text-base leading-none pb-0.5 cursor-default select-none`}
                >
                  {weather.emoji}
                </span>
              )}
            </div>
          </div>

          {/* Right: travel log button + progress circle */}
          <div className="flex items-start gap-2 flex-shrink-0">

            {/* Travel log toggle */}
            <div className="relative">
              {(() => {
                const hasData = normDayLog.locations.length > 0 || normDayLog.photo;
                // Three visual states: has-data (emerald), open (indigo), default (visible slate)
                const btnClass = hasData
                  ? showTravelLog
                    ? isTodays
                      ? 'bg-white/30 text-white ring-2 ring-white/40'
                      : 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200 dark:ring-emerald-700'
                    : isTodays
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-800/60'
                  : showTravelLog
                    ? isTodays
                      ? 'bg-white/25 text-white'
                      : 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400'
                    : isTodays
                      ? 'text-white/70 hover:text-white hover:bg-white/15'
                      : 'text-slate-400 dark:text-slate-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30';
                return (
                  <button
                    onClick={() => setShowTravelLog(v => !v)}
                    title={showTravelLog ? 'Hide travel log' : hasData ? 'View travel log' : 'Add locations & photos'}
                    className={`p-1.5 rounded-lg transition-all duration-200 ${btnClass}`}
                  >
                    <MapPin className={`w-4 h-4 ${hasData ? 'fill-current opacity-80' : ''}`} />
                  </button>
                );
              })()}
              {/* Ping animation dot when data exists and panel is closed */}
              {(normDayLog.locations.length > 0 || normDayLog.photo) && !showTravelLog && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-gray-800" />
                </span>
              )}
            </div>

            {/* Progress circle */}
            {total > 0 && (
              <div className="relative w-12 h-12 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke={isTodays ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}
                  strokeWidth="3"
                />
                <circle cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke={isTodays ? 'white' : '#6366f1'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${progress} 100`}
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold
                ${isTodays ? 'text-white' : 'text-brand-600'}`}>
                {progress}%
              </span>
              </div>
            )}
          </div>{/* end: travel-log toggle + progress ring */}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-3">
            <div className={`h-1.5 rounded-full overflow-hidden
              ${isTodays ? 'bg-white/20' : 'bg-gray-200'}`}>
              <motion.div
                className={`h-full rounded-full ${isTodays ? 'bg-white' : 'bg-brand-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <p className={`text-xs mt-1 font-medium
              ${isTodays ? 'text-brand-100' : 'text-gray-400 dark:text-gray-500'}`}>
              {completed}/{total} done
            </p>
          </div>
        )}
      </div>

      {/* Travel log panel */}
      <AnimatePresence>
        {showTravelLog && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <DayTravelLog date={date} dayLog={normDayLog} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 max-h-80 sm:max-h-96">
        <AnimatePresence mode="popLayout">
          {todos.length === 0 && !showInput && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-6 text-center"
            >
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                <Flag className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-xs text-gray-400 font-medium">No todos yet</p>
              <p className="text-xs text-gray-300">Click + to add one</p>
            </motion.div>
          )}
          {todos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              date={date}
              isDragging={draggedId === todo.id}
              isDragOver={dragOverId === todo.id}
              dragProps={{
                onDragStart: handleDragStart(todo.id),
                onDragEnter: handleDragEnter(todo.id),
                onDragOver:  handleDragOver,
                onDrop:      handleDrop,
                onDragEnd:   handleDragEnd,
              }}
            />
          ))}
        </AnimatePresence>

        {/* Add input */}
        <AnimatePresence>
          {showInput && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-2"
            >
              <input
                autoFocus
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What needs doing?"
                className="input-field text-sm py-2.5"
              />

              {/* Time picker */}
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="input-field py-1.5 text-xs flex-1"
                />
                <span className="text-xs text-gray-400">optional</span>
              </div>

              {/* Recurring toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setRecurring(v => !v)}
                  className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
                    recurring ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${
                    recurring ? 'translate-x-4' : ''
                  }`} />
                </div>
                <RefreshCw className={`w-3 h-3 ${recurring ? 'text-brand-500' : 'text-gray-400'}`} />
                <span className={`text-xs font-medium ${recurring ? 'text-brand-600' : 'text-gray-400 dark:text-gray-500'}`}>
                  Repeat every day
                </span>
              </label>

              {/* Priority selector */}
              <div className="flex gap-1.5">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPriority(opt.value)}
                    className={`flex-1 text-xs py-1.5 rounded-lg font-semibold border transition-all
                      ${priority === opt.value
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={adding || !inputText.trim()}
                  className="flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold disabled:opacity-50 transition-all"
                >
                  {adding ? 'Adding...' : recurring ? '↻ Add to All Days' : 'Add Todo'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add button */}
      {!showInput && (
        <div className="px-3 pb-3">
          <button
            onClick={() => setShowInput(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
              border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-brand-300
              text-gray-400 dark:text-gray-500 hover:text-brand-500 text-sm font-medium
              transition-all duration-200 hover:bg-brand-50 dark:hover:bg-brand-900/20"
          >
            <Plus className="w-4 h-4" />
            Add Todo
          </button>
        </div>
      )}
    </motion.div>
  );
}
