import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useThemeStore from '../store/themeStore';

/**
 * Custom hook for keyboard shortcuts
 * 
 * Shortcuts:
 * - Ctrl/Cmd + K: Global search
 * - Ctrl/Cmd + D: Toggle dark mode
 * - Ctrl/Cmd + /: Show shortcuts help
 * - Escape: Close modals/dropdowns
 */
export const useKeyboardShortcuts = (onSearchOpen) => {
    const navigate = useNavigate();
    const { toggleTheme } = useThemeStore();

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // Allow Ctrl/Cmd + K for search even in inputs
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    if (onSearchOpen) onSearchOpen();
                }
                return;
            }

            // Ctrl/Cmd + D: Toggle dark mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                toggleTheme();
            }

            // Ctrl/Cmd + /: Show shortcuts (future - can show a modal)
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                // Could show a shortcuts help modal here
                console.log('Keyboard shortcuts help (to be implemented)');
            }

            // Ctrl/Cmd + K: Global search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (onSearchOpen) onSearchOpen();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleTheme, onSearchOpen]);
};

export default useKeyboardShortcuts;

