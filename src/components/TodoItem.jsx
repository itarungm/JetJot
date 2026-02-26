import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, Pencil, X, Save, Clock, RefreshCw, GripVertical, ChevronDown, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';

const PRIORITY_STYLES = {
  low:    'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-400',
  medium: 'bg-amber-50  text-amber-700  border-amber-200  ring-amber-400',
  high:   'bg-rose-50   text-rose-700   border-rose-200   ring-rose-400',
};

const PRIORITY_DOT = {
  low:    'bg-emerald-400',
  medium: 'bg-amber-400',
  high:   'bg-rose-500',
};

const PRIORITY_LABELS = { low: 'Low', medium: 'Med', high: 'High' };

export default function TodoItem({ todo, date, dragProps = {}, isDragging = false, isDragOver = false }) {
  const { toggleTodo, deleteTodo, editTodo, addSubtask, toggleSubtask, deleteSubtask, reorderSubtasks } = useApp();
  const [editing, setEditing]         = useState(false);
  const [text, setText]               = useState(todo.text);
  const [confirm, setConfirm]         = useState(false);
  const [showSubs, setShowSubs]       = useState(false);
  const [subInput, setSubInput]       = useState('');
  const [addingSub, setAddingSub]     = useState(false);
  // Subtask drag state
  const [draggedSubId, setDraggedSubId] = useState(null);
  const [dragOverSubId, setDragOverSubId] = useState(null);

  const handleSubDragStart = (id) => (e) => {
    e.stopPropagation(); // don't trigger todo-level drag
    setDraggedSubId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleSubDragEnter = (id) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (id !== draggedSubId) setDragOverSubId(id);
  };
  const handleSubDragOver = (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; };
  const handleSubDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedSubId || !dragOverSubId || draggedSubId === dragOverSubId) {
      setDraggedSubId(null); setDragOverSubId(null); return;
    }
    const reordered = [...(todo.subtasks || [])];
    const fromIdx = reordered.findIndex(s => s.id === draggedSubId);
    const toIdx   = reordered.findIndex(s => s.id === dragOverSubId);
    const [item]  = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, item);
    reorderSubtasks(date, todo.id, reordered);
    setDraggedSubId(null); setDragOverSubId(null);
  };
  const handleSubDragEnd = (e) => { e.stopPropagation(); setDraggedSubId(null); setDragOverSubId(null); };

  const subtasks = todo.subtasks || [];
  const subDone  = subtasks.filter(s => s.completed).length;

  const handleAddSubtask = async () => {
    const t = subInput.trim();
    if (!t) return;
    setAddingSub(true);
    await addSubtask(date, todo.id, t);
    setSubInput('');
    setAddingSub(false);
  };

  const handleSave = () => {
    if (text.trim()) {
      editTodo(date, todo.id, text.trim());
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setText(todo.text); setEditing(false); }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      draggable
      {...dragProps}
      className={`group relative flex flex-col gap-2 p-3 rounded-xl border transition-all duration-200 cursor-default
        ${
          isDragging
            ? 'opacity-40 scale-[0.98] border-brand-400 ring-2 ring-brand-200 dark:ring-brand-700'
            : isDragOver
              ? 'border-brand-400 ring-2 ring-brand-200 dark:ring-brand-700'
              : todo.completed
                ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-600 hover:shadow-sm'
        }`}
    >
      {/* Priority dot + check */}
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div className="flex-shrink-0 mt-0.5 text-gray-200 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing transition-colors">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <button
          onClick={() => toggleTodo(date, todo.id)}
          className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
            ${todo.completed
              ? 'bg-brand-500 border-brand-500'
              : 'border-gray-300 hover:border-brand-400'
            }`}
        >
          <AnimatePresence>
            {todo.completed && (
              <motion.div
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Text / Edit input */}
        {editing ? (
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm bg-transparent border-b border-brand-400 dark:border-brand-500 outline-none text-gray-900 dark:text-gray-100 font-medium pb-0.5"
          />
        ) : (
          <span
            className={`flex-1 text-sm font-medium leading-snug break-words
              ${todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}
          >
            {todo.text}
          </span>
        )}

        {/* Actions */}
        <div className={`flex items-center gap-1 flex-shrink-0 transition-opacity duration-150 ${editing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {editing ? (
            <>
              <button onClick={handleSave} className="p-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/50 text-brand-500 transition-colors">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setText(todo.text); setEditing(false); }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              {!todo.completed && (
                <button onClick={() => setEditing(true)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-brand-500 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {confirm ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => deleteTodo(date, todo.id)} className="px-1.5 py-0.5 rounded text-xs bg-rose-500 text-white font-medium">
                    Yes
                  </button>
                  <button onClick={() => setConfirm(false)} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                    No
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirm(true)} className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 text-gray-400 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Badge row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${PRIORITY_STYLES[todo.priority]}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[todo.priority]}`} />
          {PRIORITY_LABELS[todo.priority]}
        </span>
        {todo.time && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700">
            <Clock className="w-3 h-3" />
            {todo.time}
          </span>
        )}
        {todo.recurring && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700">
            <RefreshCw className="w-3 h-3" />
            Daily
          </span>
        )}
        {subtasks.length > 0 && (
          <button
            onClick={() => setShowSubs(v => !v)}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border
              bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600
              hover:border-brand-300 hover:text-brand-600 transition-colors"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showSubs ? 'rotate-180' : ''}`} />
            {subDone}/{subtasks.length}
          </button>
        )}
      </div>

      {/* Sub-tasks panel */}
      <AnimatePresence>
        {showSubs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
            className="mt-1 pl-4 border-l-2 border-brand-200 dark:border-brand-700 space-y-1.5"
          >
            {subtasks.map(s => (
              <div
                key={s.id}
                draggable
                onDragStart={handleSubDragStart(s.id)}
                onDragEnter={handleSubDragEnter(s.id)}
                onDragOver={handleSubDragOver}
                onDrop={handleSubDrop}
                onDragEnd={handleSubDragEnd}
                className={`flex items-center gap-2 group/sub rounded-lg px-1 py-0.5 transition-all duration-150
                  ${ draggedSubId === s.id
                    ? 'opacity-40 scale-[0.98]'
                    : dragOverSubId === s.id
                      ? 'ring-1 ring-brand-400 bg-brand-50 dark:bg-brand-900/20'
                      : '' }`}
              >
                {/* Subtask drag handle */}
                <GripVertical className="w-3 h-3 text-gray-200 dark:text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors" />
                <button
                  onClick={() => toggleSubtask(date, todo.id, s.id)}
                  className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    s.completed ? 'bg-brand-500 border-brand-500' : 'border-gray-300 hover:border-brand-400'
                  }`}
                >
                  {s.completed && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </button>
                <span className={`flex-1 text-xs leading-snug ${
                  s.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
                }`}>{s.text}</span>
                <button
                  onClick={() => deleteSubtask(date, todo.id, s.id)}
                  className="opacity-0 group-hover/sub:opacity-100 text-gray-300 hover:text-rose-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {/* Add sub-task input */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <input
                type="text"
                value={subInput}
                onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(); }}
                placeholder="Add sub-task…"
                className="flex-1 text-xs bg-transparent border-b border-gray-200 dark:border-gray-600 outline-none py-0.5
                  text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand-400"
              />
              <button
                onClick={handleAddSubtask}
                disabled={addingSub || !subInput.trim()}
                className="flex-shrink-0 p-0.5 rounded text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/40 disabled:opacity-30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show sub-task expand button if none yet */}
      {subtasks.length === 0 && !todo.completed && (
        <button
          onClick={() => setShowSubs(true)}
          className="self-start ml-5 text-[10px] text-gray-300 dark:text-gray-600 hover:text-brand-400 transition-colors flex items-center gap-0.5"
        >
          <Plus className="w-2.5 h-2.5" /> sub-task
        </button>
      )}
    </motion.div>
  );
}
