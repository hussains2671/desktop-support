import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';
import {
    FileText,
    Search,
    Filter,
    RefreshCw,
    AlertCircle,
    AlertTriangle,
    Info,
    XCircle,
    CheckCircle,
    Download,
    Calendar,
    Monitor,
    BarChart3,
    Eye
} from 'lucide-react';

const EventLogs = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        level: 'all',
        log_type: 'all',
        source: '',
        device_id: 'all',
        start_date: '',
        end_date: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 100,
        total: 0,
        pages: 0
    });

    useEffect(() => {
        loadStats();
        loadDevices();
    }, []);

    useEffect(() => {
        loadLogs();
    }, [filters, pagination.page, searchTerm]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };

            if (filters.level !== 'all') params.level = filters.level;
            if (filters.log_type !== 'all') params.log_type = filters.log_type;
            if (filters.source) params.source = filters.source;
            if (filters.device_id !== 'all') params.device_id = filters.device_id;
            if (filters.start_date) params.start_date = filters.start_date;
            if (filters.end_date) params.end_date = filters.end_date;
            if (searchTerm) params.search = searchTerm;

            const response = await api.get('/event-logs', { params });
            setLogs(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
        } catch (error) {
            console.error('Failed to load event logs:', error);
            toast.error('Failed to load event logs');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await api.get('/event-logs/stats');
            setStats(response.data.data);
        } catch (error) {
            console.error('Failed to load event log stats:', error);
        }
    };

    const loadDevices = async () => {
        try {
            const response = await api.get('/devices');
            setDevices(response.data.data || []);
        } catch (error) {
            console.error('Failed to load devices:', error);
        }
    };

    const handleExport = async () => {
        try {
            const params = {};
            if (filters.level !== 'all') params.level = filters.level;
            if (filters.log_type !== 'all') params.log_type = filters.log_type;
            if (filters.source) params.source = filters.source;
            if (filters.device_id !== 'all') params.device_id = filters.device_id;
            if (filters.start_date) params.start_date = filters.start_date;
            if (filters.end_date) params.end_date = filters.end_date;

            const response = await api.get('/event-logs/export', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `event-logs-${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Event logs exported successfully');
        } catch (error) {
            console.error('Failed to export event logs:', error);
            toast.error('Failed to export event logs');
        }
    };

    const handleViewDetails = (log) => {
        setSelectedLog(log);
        setShowDetails(true);
    };

    const getLevelBadge = (level) => {
        const badges = {
            critical: {
                icon: XCircle,
                color: 'bg-red-100 text-red-800 border-red-200',
                label: 'Critical'
            },
            error: {
                icon: AlertCircle,
                color: 'bg-orange-100 text-orange-800 border-orange-200',
                label: 'Error'
            },
            warning: {
                icon: AlertTriangle,
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                label: 'Warning'
            },
            information: {
                icon: Info,
                color: 'bg-blue-100 text-blue-800 border-blue-200',
                label: 'Information'
            },
            verbose: {
                icon: CheckCircle,
                color: 'bg-gray-100 text-gray-800 border-gray-200 dark:border-gray-700',
                label: 'Verbose'
            }
        };
        const badge = badges[level] || badges.information;
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border ${badge.color}`}>
                <Icon className="w-3 h-3" />
                {badge.label}
            </span>
        );
    };

    const getTypeBadge = (type) => {
        const colors = {
            system: 'bg-purple-100 text-purple-800',
            application: 'bg-blue-100 text-blue-800',
            security: 'bg-red-100 text-red-800',
            hardware: 'bg-green-100 text-green-800',
            custom: 'bg-gray-100 text-gray-800'
        };
        return colors[type] || colors.custom;
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Event Logs</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">System and application event logs</p>
            </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={() => {
                            loadLogs();
                            loadStats();
                            toast.success('Event logs refreshed');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Logs</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total || 0}</p>
                            </div>
                            <div className="bg-blue-500 p-3 rounded-lg">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Critical (24h)</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">{stats.recent_critical || 0}</p>
                            </div>
                            <div className="bg-red-500 p-3 rounded-lg">
                                <XCircle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Errors (24h)</p>
                                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.recent_errors || 0}</p>
                            </div>
                            <div className="bg-orange-500 p-3 rounded-lg">
                                <AlertCircle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">By Level</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {Object.keys(stats.by_level || {}).length} levels
                                </p>
                            </div>
                            <div className="bg-purple-500 p-3 rounded-lg">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-3 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search logs by message, source, or category..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Level Filter */}
                    <select
                        value={filters.level}
                        onChange={(e) => {
                            setFilters(prev => ({ ...prev, level: e.target.value }));
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Levels</option>
                        <option value="critical">Critical</option>
                        <option value="error">Error</option>
                        <option value="warning">Warning</option>
                        <option value="information">Information</option>
                        <option value="verbose">Verbose</option>
                    </select>

                    {/* Type Filter */}
                    <select
                        value={filters.log_type}
                        onChange={(e) => {
                            setFilters(prev => ({ ...prev, log_type: e.target.value }));
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Types</option>
                        <option value="system">System</option>
                        <option value="application">Application</option>
                        <option value="security">Security</option>
                        <option value="hardware">Hardware</option>
                        <option value="custom">Custom</option>
                    </select>

                    {/* Device Filter */}
                    <select
                        value={filters.device_id}
                        onChange={(e) => {
                            setFilters(prev => ({ ...prev, device_id: e.target.value }));
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Devices</option>
                        {devices.map(device => (
                            <option key={device.id} value={device.id}>
                                {device.hostname || `Device ${device.id}`}
                            </option>
                        ))}
                    </select>

                    {/* Source Filter */}
                    <input
                        type="text"
                        placeholder="Source filter..."
                        value={filters.source}
                        onChange={(e) => {
                            setFilters(prev => ({ ...prev, source: e.target.value }));
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <input
                            type="date"
                            value={filters.start_date}
                            onChange={(e) => {
                                setFilters(prev => ({ ...prev, start_date: e.target.value }));
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Start Date"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <input
                            type="date"
                            value={filters.end_date}
                            onChange={(e) => {
                                setFilters(prev => ({ ...prev, end_date: e.target.value }));
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="End Date"
                        />
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Device
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Level
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Source
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Message
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No event logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(log.time_generated).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.Device ? (
                                                <Link
                                                    to={`/devices/${log.Device.id}`}
                                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                >
                                                    <Monitor className="w-4 h-4" />
                                                    {log.Device.hostname || 'Unknown'}
                                                </Link>
                                            ) : (
                                                <span className="text-sm text-gray-500">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getLevelBadge(log.level)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeBadge(log.log_type)}`}>
                                                {log.log_type?.toUpperCase() || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {log.source || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-900 dark:text-white line-clamp-2 max-w-md">
                                                {log.message || 'No message'}
                                            </p>
                                            {log.event_id && (
                                                <p className="text-xs text-gray-500 mt-1">Event ID: {log.event_id}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleViewDetails(log)}
                                                className="text-blue-600 hover:text-blue-900 p-1"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-700">
                            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total logs)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                disabled={pagination.page === 1}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                                disabled={pagination.page === pagination.pages}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Log Details Modal */}
            {showDetails && selectedLog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Event Log Details</h2>
                            <button
                                onClick={() => {
                                    setShowDetails(false);
                                    setSelectedLog(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Message</h3>
                                <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">{selectedLog.message || 'No message'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Level</dt>
                                    <dd className="mt-1">{getLevelBadge(selectedLog.level)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Type</dt>
                                    <dd className="mt-1">
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeBadge(selectedLog.log_type)}`}>
                                            {selectedLog.log_type?.toUpperCase() || 'N/A'}
                                        </span>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Source</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.source || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Event ID</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.event_id || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.category || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Time Generated</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                                        {new Date(selectedLog.time_generated).toLocaleString()}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Device</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                                        {selectedLog.Device ? (
                                            <Link
                                                to={`/devices/${selectedLog.Device.id}`}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                {selectedLog.Device.hostname || 'Unknown'}
                                            </Link>
                                        ) : (
                                            'N/A'
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">User</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.user_name || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Computer Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.computer_name || 'N/A'}</dd>
                                </div>
                            </div>

                            {selectedLog.raw_data && Object.keys(selectedLog.raw_data).length > 0 && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 mb-2">Raw Data</dt>
                                    <dd className="mt-1">
                                        <pre className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto">
                                            {JSON.stringify(selectedLog.raw_data, null, 2)}
                                        </pre>
                                    </dd>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => {
                                        setShowDetails(false);
                                        setSelectedLog(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:bg-gray-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
            </div>
                </div>
            )}
        </div>
    );
};

export default EventLogs;
