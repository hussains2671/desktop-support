import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    AlertTriangle,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    RefreshCw,
    X
} from 'lucide-react';
import BulkActions from '../components/Common/BulkActions';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';

const Alerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        open: 0,
        critical: 0,
        high: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAlerts, setSelectedAlerts] = useState([]);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        severity: 'all',
        alert_type: 'all',
        device_id: 'all'
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });
    const [devices, setDevices] = useState([]);

    useEffect(() => {
        loadAlerts();
        loadStats();
        loadDevices();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            loadAlerts();
            loadStats();
        }, 30000);

        return () => clearInterval(interval);
    }, [filters, pagination.page]);

    const loadAlerts = async () => {
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };

            if (filters.status !== 'all') params.status = filters.status;
            if (filters.severity !== 'all') params.severity = filters.severity;
            if (filters.alert_type !== 'all') params.alert_type = filters.alert_type;
            if (filters.device_id !== 'all') params.device_id = filters.device_id;

            const response = await api.get('/alerts', { params });
            setAlerts(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
            setError(null);
        } catch (error) {
            console.error('Failed to load alerts:', error);
            setError(error.response?.data?.message || 'Failed to load alerts');
            toast.error('Failed to load alerts');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await api.get('/alerts/stats');
            setStats(response.data.data || { total: 0, open: 0, critical: 0, high: 0 });
        } catch (error) {
            console.error('Failed to load alert stats:', error);
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

    const handleAcknowledge = async (alertId) => {
        try {
            await api.post(`/alerts/${alertId}/acknowledge`);
            toast.success('Alert acknowledged');
            loadAlerts();
            loadStats();
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
            toast.error('Failed to acknowledge alert');
        }
    };

    const handleResolve = async (alertId) => {
        try {
            await api.post(`/alerts/${alertId}/resolve`);
            toast.success('Alert resolved');
            loadAlerts();
            loadStats();
        } catch (error) {
            console.error('Failed to resolve alert:', error);
            toast.error('Failed to resolve alert');
        }
    };

    const handleViewDetails = async (alertId) => {
        try {
            const response = await api.get(`/alerts/${alertId}`);
            setSelectedAlert(response.data.data);
            setShowDetails(true);
        } catch (error) {
            console.error('Failed to load alert details:', error);
            toast.error('Failed to load alert details');
        }
    };

    const getSeverityBadge = (severity) => {
        const colors = {
            critical: 'bg-red-100 text-red-800 border-red-200',
            high: 'bg-orange-100 text-orange-800 border-orange-200',
            medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            low: 'bg-blue-100 text-blue-800 border-blue-200'
        };
        return colors[severity] || colors.low;
    };

    const getStatusBadge = (status) => {
        const badges = {
            open: {
                icon: AlertTriangle,
                color: 'bg-red-100 text-red-800',
                label: 'Open'
            },
            acknowledged: {
                icon: Clock,
                color: 'bg-yellow-100 text-yellow-800',
                label: 'Acknowledged'
            },
            resolved: {
                icon: CheckCircle,
                color: 'bg-green-100 text-green-800',
                label: 'Resolved'
            }
        };
        const badge = badges[status] || badges.open;
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                <Icon className="w-3 h-3" />
                {badge.label}
            </span>
        );
    };

    const filteredAlerts = alerts.filter(alert => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            alert.title?.toLowerCase().includes(searchLower) ||
            alert.message?.toLowerCase().includes(searchLower) ||
            alert.Device?.hostname?.toLowerCase().includes(searchLower)
        );
    });

    const statCards = [
        {
            title: 'Total Alerts',
            value: stats.total,
            icon: AlertTriangle,
            color: 'bg-blue-500'
        },
        {
            title: 'Open Alerts',
            value: stats.open,
            icon: XCircle,
            color: 'bg-red-500'
        },
        {
            title: 'Critical',
            value: stats.critical,
            icon: AlertTriangle,
            color: 'bg-red-600'
        },
        {
            title: 'High Priority',
            value: stats.high,
            icon: AlertTriangle,
            color: 'bg-orange-500'
        }
    ];

    if (loading && alerts.length === 0) {
        return <LoadingSpinner size="lg" text="Loading alerts..." />;
    }

    if (error && alerts.length === 0) {
        return (
            <ErrorDisplay 
                error={error} 
                onRetry={loadAlerts}
                title="Failed to Load Alerts"
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Alerts</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor and manage system alerts</p>
                </div>
                <button
                    onClick={() => {
                        loadAlerts();
                        loadStats();
                        toast.success('Alerts refreshed');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{stat.title}</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                                </div>
                                <div className={`${stat.color} p-3 rounded-lg`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search alerts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={(e) => {
                            setFilters(prev => ({ ...prev, status: e.target.value }));
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="resolved">Resolved</option>
                    </select>

                    {/* Severity Filter */}
                    <select
                        value={filters.severity}
                        onChange={(e) => {
                            setFilters(prev => ({ ...prev, severity: e.target.value }));
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Severity</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>

                    {/* Alert Type Filter */}
                    <select
                        value={filters.alert_type}
                        onChange={(e) => {
                            setFilters(prev => ({ ...prev, alert_type: e.target.value }));
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Types</option>
                        <option value="performance">Performance</option>
                        <option value="security">Security</option>
                        <option value="system">System</option>
                        <option value="device">Device</option>
                    </select>

                    {/* Device Filter */}
                    <select
                        value={filters.device_id}
                        onChange={(e) => {
                            setFilters(prev => ({ ...prev, device_id: e.target.value }));
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Devices</option>
                        {devices.map(device => (
                            <option key={device.id} value={device.id}>
                                {device.hostname || `Device ${device.id}`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Alerts Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    <input
                                        type="checkbox"
                                        checked={selectedAlerts.length === filteredAlerts.length && filteredAlerts.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedAlerts(filteredAlerts.map(a => a.id));
                                            } else {
                                                setSelectedAlerts([]);
                                            }
                                        }}
                                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Alert
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Device
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Severity
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredAlerts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        {loading ? 'Loading alerts...' : 'No alerts found'}
                                    </td>
                                </tr>
                            ) : (
                                filteredAlerts.map((alert) => (
                                    <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedAlerts.includes(alert.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedAlerts([...selectedAlerts, alert.id]);
                                                    } else {
                                                        setSelectedAlerts(selectedAlerts.filter(id => id !== alert.id));
                                                    }
                                                }}
                                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.title}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{alert.message}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {alert.Device ? (
                                                <Link
                                                    to={`/devices/${alert.Device.id}`}
                                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                                >
                                                    {alert.Device.hostname || 'Unknown'}
                                                </Link>
                                            ) : (
                                                <span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityBadge(alert.severity)} dark:opacity-80`}>
                                                {alert.severity?.toUpperCase() || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(alert.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(alert.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewDetails(alert.id)}
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {alert.status === 'open' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleAcknowledge(alert.id)}
                                                            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300 p-1"
                                                            title="Acknowledge"
                                                        >
                                                            <Clock className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleResolve(alert.id)}
                                                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1"
                                                            title="Resolve"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {alert.status === 'acknowledged' && (
                                                    <button
                                                        onClick={() => handleResolve(alert.id)}
                                                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1"
                                                        title="Resolve"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Bulk Actions for Alerts */}
            {selectedAlerts.length > 0 && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {selectedAlerts.length} alert{selectedAlerts.length !== 1 ? 's' : ''} selected
                        </div>
                        
                        <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-4">
                            <button
                                onClick={async () => {
                                    const openAlerts = alerts.filter(a => selectedAlerts.includes(a.id) && a.status === 'open');
                                    if (openAlerts.length > 0) {
                                        try {
                                            await Promise.all(openAlerts.map(alert => api.post(`/alerts/${alert.id}/acknowledge`)));
                                            toast.success(`Acknowledged ${openAlerts.length} alert(s)`);
                                            setSelectedAlerts([]);
                                            loadAlerts();
                                            loadStats();
                                        } catch (error) {
                                            toast.error('Failed to acknowledge alerts');
                                        }
                                    } else {
                                        toast.info('No open alerts selected to acknowledge');
                                    }
                                }}
                                className="px-3 py-1.5 text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors flex items-center gap-1"
                            >
                                <Clock className="w-4 h-4" />
                                Acknowledge
                            </button>
                            
                            <button
                                onClick={async () => {
                                    const unresolvedAlerts = alerts.filter(a => selectedAlerts.includes(a.id) && a.status !== 'resolved');
                                    if (unresolvedAlerts.length > 0) {
                                        try {
                                            await Promise.all(unresolvedAlerts.map(alert => api.post(`/alerts/${alert.id}/resolve`)));
                                            toast.success(`Resolved ${unresolvedAlerts.length} alert(s)`);
                                            setSelectedAlerts([]);
                                            loadAlerts();
                                            loadStats();
                                        } catch (error) {
                                            toast.error('Failed to resolve alerts');
                                        }
                                    } else {
                                        toast.info('No unresolved alerts selected');
                                    }
                                }}
                                className="px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors flex items-center gap-1"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Resolve
                            </button>
                            
                            <button
                                onClick={() => setSelectedAlerts([])}
                                className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
                            >
                                <X className="w-4 h-4" />
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                    <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                        <div className="text-sm text-gray-700">
                            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total alerts)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                disabled={pagination.page === 1}
                                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                                disabled={pagination.page === pagination.pages}
                                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

            {/* Alert Details Modal */}
            {showDetails && selectedAlert && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Alert Details</h2>
                            <button
                                onClick={() => {
                                    setShowDetails(false);
                                    setSelectedAlert(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">{selectedAlert.title}</h3>
                                <p className="text-gray-600">{selectedAlert.message}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Severity</dt>
                                    <dd className="mt-1">
                                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityBadge(selectedAlert.severity)}`}>
                                            {selectedAlert.severity?.toUpperCase() || 'UNKNOWN'}
                                        </span>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                                    <dd className="mt-1">{getStatusBadge(selectedAlert.status)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Alert Type</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{selectedAlert.alert_type || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Device</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {selectedAlert.Device ? (
                                            <Link
                                                to={`/devices/${selectedAlert.Device.id}`}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                {selectedAlert.Device.hostname || 'Unknown'}
                                            </Link>
                                        ) : (
                                            'N/A'
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {new Date(selectedAlert.created_at).toLocaleString()}
                                    </dd>
                                </div>
                                {selectedAlert.acknowledged_at && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Acknowledged At</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {new Date(selectedAlert.acknowledged_at).toLocaleString()}
                                        </dd>
                                    </div>
                                )}
                                {selectedAlert.resolved_at && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Resolved At</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {new Date(selectedAlert.resolved_at).toLocaleString()}
                                        </dd>
                                    </div>
                                )}
                                {selectedAlert.AcknowledgedBy && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Acknowledged By</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {selectedAlert.AcknowledgedBy.first_name} {selectedAlert.AcknowledgedBy.last_name}
                                        </dd>
                                    </div>
                                )}
                            </div>

                            {selectedAlert.metadata && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 mb-2">Additional Information</dt>
                                    <dd className="mt-1">
                                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                                            {JSON.stringify(selectedAlert.metadata, null, 2)}
                                        </pre>
                                    </dd>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                {selectedAlert.status === 'open' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                handleAcknowledge(selectedAlert.id);
                                                setShowDetails(false);
                                            }}
                                            className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                                        >
                                            Acknowledge
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleResolve(selectedAlert.id);
                                                setShowDetails(false);
                                            }}
                                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Resolve
                                        </button>
                                    </>
                                )}
                                {selectedAlert.status === 'acknowledged' && (
                                    <button
                                        onClick={() => {
                                            handleResolve(selectedAlert.id);
                                            setShowDetails(false);
                                        }}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        Resolve
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowDetails(false);
                                        setSelectedAlert(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

export default Alerts;
