import { create } from 'zustand';

// Load theme from localStorage
const getStoredTheme = () => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('theme') || 'light';
};

// Apply theme to document
const applyTheme = (theme) => {
    if (typeof document === 'undefined') return;
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
};

// Initialize theme on load
const initialTheme = getStoredTheme();
applyTheme(initialTheme);

const useThemeStore = create((set) => ({
    theme: initialTheme,
    toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        return { theme: newTheme };
    }),
    setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
    }
}));

export default useThemeStore;

