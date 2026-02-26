import { Heart, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full py-3 px-4 flex items-center justify-center gap-1.5 border-t border-gray-100 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
      <span className="text-xs text-gray-400 dark:text-gray-500">Made with</span>
      <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
      <span className="text-xs text-gray-400 dark:text-gray-500">by</span>
      <a
        href="https://www.linkedin.com/in/itarungm"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold text-brand-500 hover:text-brand-700 transition-colors hover:underline underline-offset-2"
      >
        iTarunGM
      </a>
      <span className="text-gray-200 dark:text-gray-700 mx-0.5">·</span>
      <a
        href="https://github.com/itarungm/jetjot"
        target="_blank"
        rel="noopener noreferrer"
        title="View on GitHub"
        className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <Github className="w-3.5 h-3.5" />
      </a>
    </footer>
  );
}
