import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Search, X, Monitor, AlertTriangle, Users, FileText, Loader2 } from 'lucide-react';

const GlobalSearch = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({
        devices: [],
        alerts: [],
        users: [],
        logs: []
    });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (query.length >= 2) {
            const debounceTimer = setTimeout(() => {
                performSearch(query);
            }, 300);

            return () => clearTimeout(debounceTimer);
        } else {
            setResults({ devices: [], alerts: [], users: [], logs: [] });
        }
    }, [query]);

    const performSearch = async (searchQuery) => {
        setLoading(true);
        try {
            const [devicesRes, alertsRes, usersRes, logsRes] = await Promise.allSettled([
                api.get('/devices', { params: { search: searchQuery, limit: 5 } }),
                api.get('/alerts', { params: { search: searchQuery, limit: 5 } }),
                api.get('/admin/users', { params: { search: searchQuery, limit: 5 } }).catch(() => ({ data: { data: [] } })),
                api.get('/event-logs', { params: { search: searchQuery, limit: 5 } })
            ]);

            setResults({
                devices: devicesRes.status === 'fulfilled' ? (devicesRes.value.data.data || []) : [],
                alerts: alertsRes.status === 'fulfilled' ? (alertsRes.value.data.data || []) : [],
                users: usersRes.status === 'fulfilled' ? (usersRes.value.data.data || []) : [],
                logs: logsRes.status === 'fulfilled' ? (logsRes.value.data.data || []) : []
            });
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResultClick = (type, item) => {
        onClose();
        switch (type) {
            case 'device':
                navigate(`/devices/${item.id}`);
                break;
            case 'alert':
                navigate(`/alerts`);
                break;
            case 'user':
                navigate(`/users`);
                break;
            case 'log':
                navigate(`/logs`);
                break;
            default:
                break;
        }
    };

    const totalResults = results.devices.length + results.alerts.length + results.users.length + results.logs.length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div 
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
                    onClick={onClose}
                ></div>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Global Search
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search devices, alerts, users, logs..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {loading && (
                                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
                            )}
                        </div>

                        {query.length >= 2 && (
                            <div className="mt-4">
                                {totalResults === 0 && !loading ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        No results found for "{query}"
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {results.devices.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    <Monitor className="w-4 h-4" />
                                                    Devices ({results.devices.length})
                                                </div>
                                                <div className="space-y-1">
                                                    {results.devices.map((device) => (
                                                        <button
                                                            key={device.id}
                                                            onClick={() => handleResultClick('device', device)}
                                                            className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {device.hostname || 'Unknown'}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {device.serial_number || 'No serial'}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {results.alerts.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Alerts ({results.alerts.length})
                                                </div>
                                                <div className="space-y-1">
                                                    {results.alerts.map((alert) => (
                                                        <button
                                                            key={alert.id}
                                                            onClick={() => handleResultClick('alert', alert)}
                                                            className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {alert.title}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {alert.severity} • {alert.status}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {results.users.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    <Users className="w-4 h-4" />
                                                    Users ({results.users.length})
                                                </div>
                                                <div className="space-y-1">
                                                    {results.users.map((user) => (
                                                        <button
                                                            key={user.id}
                                                            onClick={() => handleResultClick('user', user)}
                                                            className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {user.first_name} {user.last_name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {user.email}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {results.logs.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    <FileText className="w-4 h-4" />
                                                    Event Logs ({results.logs.length})
                                                </div>
                                                <div className="space-y-1">
                                                    {results.logs.map((log) => (
                                                        <button
                                                            key={log.id}
                                                            onClick={() => handleResultClick('log', log)}
                                                            className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {log.message}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {log.level} • {new Date(log.created_at).toLocaleString()}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {query.length < 2 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                Type at least 2 characters to search
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;

