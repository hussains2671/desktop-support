import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, Monitor, CheckCircle, XCircle, Clock } from 'lucide-react';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';
import BulkActions from '../components/Common/BulkActions';
import toast from 'react-hot-toast';

const Devices = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedDevices, setSelectedDevices] = useState([]);

    useEffect(() => {
        loadDevices();
    }, [statusFilter]);

    const loadDevices = async () => {
        try {
            const params = {};
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }
            const response = await api.get('/devices', { params });
            setDevices(response.data.data);
            setError(null);
        } catch (error) {
            console.error('Failed to load devices:', error);
            setError(error.response?.data?.message || 'Failed to load devices');
        } finally {
            setLoading(false);
        }
    };

    const filteredDevices = devices.filter(device => {
        const matchesSearch = 
            device.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const getStatusBadge = (device) => {
        const agentStatus = device.Agent?.status;
        if (agentStatus === 'online') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Online
                </span>
            );
        } else if (agentStatus === 'offline') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full">
                    <XCircle className="w-3 h-3" />
                    Offline
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
                <Clock className="w-3 h-3" />
                Unknown
            </span>
        );
    };

    if (loading) {
        return <LoadingSpinner size="lg" text="Loading devices..." />;
    }

    if (error) {
        return (
            <ErrorDisplay 
                error={error} 
                onRetry={loadDevices}
                title="Failed to Load Devices"
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Devices</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and monitor your devices</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search devices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Devices Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    <input
                                        type="checkbox"
                                        checked={selectedDevices.length === filteredDevices.length && filteredDevices.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedDevices(filteredDevices.map(d => d.id));
                                            } else {
                                                setSelectedDevices([]);
                                            }
                                        }}
                                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Device
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    OS
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Last Seen
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredDevices.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No devices found
                                    </td>
                                </tr>
                            ) : (
                                filteredDevices.map((device) => (
                                    <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedDevices.includes(device.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedDevices([...selectedDevices, device.id]);
                                                    } else {
                                                        setSelectedDevices(selectedDevices.filter(id => id !== device.id));
                                                    }
                                                }}
                                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Monitor className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {device.hostname || 'Unknown'}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {device.serial_number || 'No serial'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">{device.username || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {device.os_name} {device.os_version}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(device)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {device.last_seen 
                                                ? new Date(device.last_seen).toLocaleString()
                                                : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link
                                                to={`/devices/${device.id}`}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bulk Actions */}
            <BulkActions
                selectedItems={selectedDevices}
                onBulkDelete={async () => {
                    if (window.confirm(`Are you sure you want to delete ${selectedDevices.length} device(s)?`)) {
                        try {
                            await Promise.all(selectedDevices.map(id => api.delete(`/devices/${id}`)));
                            toast.success(`Deleted ${selectedDevices.length} device(s)`);
                            setSelectedDevices([]);
                            loadDevices();
                        } catch (error) {
                            toast.error('Failed to delete devices');
                        }
                    }
                }}
                onClearSelection={() => setSelectedDevices([])}
                availableActions={['delete']}
            />
        </div>
    );
};

export default Devices;

