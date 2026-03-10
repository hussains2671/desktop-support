import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import GlobalSearch from './GlobalSearch';
import {
    LayoutDashboard,
    Monitor,
    HardDrive,
    FileText,
    AlertTriangle,
    Settings,
    Users,
    Server,
    LogOut,
    Menu,
    X,
    Brain,
    BarChart3,
    Moon,
    Sun,
    Search,
    Terminal,
    Ticket
} from 'lucide-react';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const { user, company, logout } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Enable keyboard shortcuts
    useKeyboardShortcuts(() => setSearchOpen(true));

    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
    const isCompanyAdmin = user?.role === 'company_admin';

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['all'] },
        { icon: Monitor, label: 'Devices', path: '/devices', roles: ['all'] },
        { icon: HardDrive, label: 'Inventory', path: '/inventory', roles: ['all'] },
        { icon: FileText, label: 'Event Logs', path: '/logs', roles: ['all'] },
        { icon: Brain, label: 'AI Insights', path: '/ai-insights', roles: ['all'], feature: 'ai_insights' },
        { icon: AlertTriangle, label: 'Alerts', path: '/alerts', roles: ['all'] },
        { icon: Ticket, label: 'Tickets', path: '/tickets', roles: ['all'] },
        { icon: BarChart3, label: 'SLA Management', path: '/sla-management', roles: ['admin', 'company_admin', 'support'] },
        { icon: Users, label: 'Users', path: '/users', roles: ['super_admin', 'admin', 'company_admin'] },
        { icon: Server, label: 'Agents', path: '/agents', roles: ['super_admin', 'admin', 'company_admin'] },
        { icon: Terminal, label: 'Remote Commands', path: '/remote-commands', roles: ['super_admin', 'admin', 'company_admin', 'technician'] },
        { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['all'] },
        { icon: AlertTriangle, label: 'Notifications', path: '/notifications', roles: ['all'] },
        { icon: Settings, label: 'Settings', path: '/settings', roles: ['all'] }
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredMenuItems = menuItems.filter(item => {
        if (item.roles.includes('all')) return true;
        return item.roles.includes(user?.role);
    });

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 dark:bg-gray-800 text-white transition-all duration-300 hidden md:block`}>
                <div className="p-4">
                    <div className="flex items-center justify-between mb-8">
                        {sidebarOpen && (
                            <h1 className="text-xl font-bold">Aaditech Solution Desktop Support</h1>
                        )}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className="p-2 hover:bg-gray-800 dark:hover:bg-gray-700 rounded transition-colors"
                                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode (Ctrl+D)`}
                            >
                                {theme === 'dark' ? (
                                    <Sun className="w-5 h-5" />
                                ) : (
                                    <Moon className="w-5 h-5" />
                                )}
                            </button>
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 hover:bg-gray-800 dark:hover:bg-gray-700 rounded"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <nav className="space-y-2">
                        {filteredMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                        isActive
                                            ? 'bg-blue-600 dark:bg-blue-700 text-white'
                                            : 'text-gray-300 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    {sidebarOpen && <span>{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
                    <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            {user?.first_name?.[0] || 'U'}
                        </div>
                        {sidebarOpen && (
                            <div>
                                <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                                <p className="text-xs text-gray-400">{company?.name}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full p-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors ${
                            !sidebarOpen && 'justify-center'
                        }`}
                    >
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
                    <div className="w-64 h-full bg-gray-900 dark:bg-gray-800 text-white p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-8">
                            <h1 className="text-xl font-bold">Aaditech Solution Desktop Support</h1>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 hover:bg-gray-800 dark:hover:bg-gray-700 rounded"
                                >
                                    {theme === 'dark' ? (
                                        <Sun className="w-5 h-5" />
                                    ) : (
                                        <Moon className="w-5 h-5" />
                                    )}
                                </button>
                                <button onClick={() => setMobileMenuOpen(false)}>
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <nav className="space-y-2">
                            {filteredMenuItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-gray-800"
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                            <Menu className="w-6 h-6 text-gray-900 dark:text-gray-100" />
                        </button>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                title="Search (Ctrl/Cmd + K)"
                            >
                                <Search className="w-4 h-4" />
                                <span>Search...</span>
                                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded">
                                    ⌘K
                                </kbd>
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{company?.name}</span>
                            {company?.plan && (
                                <span className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full">
                                    {company.plan}
                                </span>
                            )}
                            <button
                                onClick={toggleTheme}
                                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                            >
                                {theme === 'dark' ? (
                                    <Sun className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                                ) : (
                                    <Moon className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                                )}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
                    <Outlet />
                </main>
            </div>

            {/* Global Search Modal */}
            <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
    );
};

export default Layout;

