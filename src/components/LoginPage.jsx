import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, User, Lock, ArrowRight, Loader2, Eye, EyeOff, AlertTriangle, Database, ShieldAlert } from 'lucide-react';
import { loginOrCreate } from '../lib/auth';
import { getRateLimitStatus } from '../lib/rateLimiter';
import { useApp } from '../context/AppContext';
import Footer from './Footer';

const floatingDots = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 6 + 3,
  delay: Math.random() * 4,
  duration: Math.random() * 6 + 8,
}));

export default function LoginPage() {
  const { login } = useApp();
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [welcome, setWelcome]       = useState(null); // null | 'new' | 'back'
  const [attemptsLeft, setAttemptsLeft] = useState(null); // null = not shown yet

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Both fields are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await loginOrCreate(username.trim(), password.trim());
      setAttemptsLeft(null);
      setWelcome(result.isNew ? 'new' : 'back');
      setTimeout(() => login(result.username, result.isAdmin), 900);
    } catch (err) {
      setError(err.message);
      // Update remaining attempts display (after increment already happened in rateLimiter)
      const status = getRateLimitStatus(username.trim().toLowerCase());
      if (status.remaining <= 3) setAttemptsLeft(status.remaining);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">

      {/* Main centering area */}
      <div className="flex-1 flex items-center justify-center p-4 relative">

      {/* Background animated blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-200 dark:bg-brand-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-200 dark:bg-violet-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-100 dark:bg-pink-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Floating dots */}
      {floatingDots.map(dot => (
        <motion.div
          key={dot.id}
          className="absolute rounded-full bg-brand-300 opacity-20"
          style={{ left: `${dot.x}%`, top: `${dot.y}%`, width: dot.size, height: dot.size }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: dot.duration, delay: dot.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 dark:border-gray-600/60 p-8 sm:p-10">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 bg-gradient-to-br from-brand-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg mb-4"
            >
              <Zap className="w-8 h-8 text-white fill-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight"
            >
              Jet<span className="text-brand-500">Jot</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 dark:text-gray-500 text-sm mt-1 font-medium"
            >
              Your plans, your pace.
            </motion.p>
          </div>

          {/* Success overlay */}
          <AnimatePresence>
            {welcome && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-white/90 backdrop-blur rounded-3xl flex flex-col items-center justify-center gap-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  className="w-20 h-20 bg-gradient-to-br from-brand-500 to-violet-600 rounded-full flex items-center justify-center"
                >
                  <Zap className="w-10 h-10 text-white fill-white" />
                </motion.div>
                <p className="text-2xl font-bold text-gray-900">
                  {welcome === 'new' ? 'Account Created!' : 'Welcome back!'}
                </p>
                <p className="text-gray-500 text-sm">Taking you in...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Username */}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field pl-10"
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field pl-10 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {error.toLowerCase().includes('firebase') || error.toLowerCase().includes('database') ? (
                    /* Firebase config error — show setup card */
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                        <Database className="w-4 h-4 flex-shrink-0" />
                        Firebase not configured yet
                      </div>
                      <p className="text-amber-600 text-xs leading-relaxed">
                        Fill in your real credentials in the <code className="bg-amber-100 px-1 rounded">.env</code> file, then restart the dev server.
                      </p>
                      <ol className="text-amber-600 text-xs space-y-0.5 list-decimal list-inside">
                        <li>Go to <strong>console.firebase.google.com</strong></li>
                        <li>Create project → Add Web App → copy config</li>
                        <li>Paste values into <code className="bg-amber-100 px-1 rounded">.env</code></li>
                        <li>Enable <strong>Firestore Database</strong> in Firebase console</li>
                        <li>Run <code className="bg-amber-100 px-1 rounded">npm run dev</code> again</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Error message */}
                      <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-rose-600 font-medium leading-snug">{error}</p>
                      </div>
                      {/* Attempts warning */}
                      {attemptsLeft !== null && !error.toLowerCase().includes('wait') && (
                        <div className="flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2">
                          <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          <p className="text-xs text-orange-600 font-semibold">
                            {attemptsLeft === 0
                              ? 'No attempts left. Please wait 15 minutes.'
                              : `${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining before lockout.`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || attemptsLeft === 0}
              className="btn-primary flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Let&apos;s Go
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.form>

          {/* Hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6 leading-relaxed"
          >
            No signup needed. New user? We&apos;ll create your account instantly.
          </motion.p>
        </div>
      </motion.div>
      </div>{/* /centering */}
      <Footer />
    </div>
  );
}
