import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';
import {
    HardDrive,
    Package,
    Search,
    Filter,
    RefreshCw,
    Monitor,
    Cpu,
    MemoryStick,
    HardDriveIcon,
    Monitor as MonitorIcon,
    BarChart3,
    Download
} from 'lucide-react';

const Inventory = () => {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'hardware', 'software'
    const [hardware, setHardware] = useState([]);
    const [software, setSoftware] = useState([]);
    const [stats, setStats] = useState(null);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        device_id: 'all',
        component_type: 'all',
        manufacturer: '',
        publisher: '',
        is_system: 'all'
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
    });

    useEffect(() => {
        loadStats();
        loadDevices();
    }, []);

    useEffect(() => {
        if (activeTab === 'hardware') {
            loadHardware();
        } else if (activeTab === 'software') {
            loadSoftware();
        }
    }, [activeTab, filters, pagination.page, searchTerm]);

    const loadStats = async () => {
        try {
            const response = await api.get('/inventory/stats');
            setStats(response.data.data);
        } catch (error) {
            console.error('Failed to load inventory stats:', error);
            toast.error('Failed to load inventory statistics');
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

    const loadHardware = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };

            if (filters.device_id !== 'all') params.device_id = filters.device_id;
            if (filters.component_type !== 'all') params.component_type = filters.component_type;
            if (filters.manufacturer) params.manufacturer = filters.manufacturer;
            if (searchTerm) params.search = searchTerm;

            const response = await api.get('/inventory/hardware', { params });
            setHardware(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
        } catch (error) {
            console.error('Failed to load hardware inventory:', error);
            toast.error('Failed to load hardware inventory');
        } finally {
            setLoading(false);
        }
    };

    const loadSoftware = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };

            if (filters.device_id !== 'all') params.device_id = filters.device_id;
            if (filters.publisher) params.publisher = filters.publisher;
            if (filters.is_system !== 'all') params.is_system = filters.is_system;
            if (searchTerm) params.search = searchTerm;

            const response = await api.get('/inventory/software', { params });
            setSoftware(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
        } catch (error) {
            console.error('Failed to load software inventory:', error);
            toast.error('Failed to load software inventory');
        } finally {
            setLoading(false);
        }
    };

    const getComponentIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'cpu':
                return <Cpu className="w-5 h-5" />;
            case 'ram':
            case 'memory':
                return <MemoryStick className="w-5 h-5" />;
            case 'hdd':
            case 'ssd':
                return <HardDriveIcon className="w-5 h-5" />;
            case 'display':
            case 'monitor':
                return <MonitorIcon className="w-5 h-5" />;
            default:
                return <HardDrive className="w-5 h-5" />;
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const componentTypes = ['cpu', 'ram', 'hdd', 'ssd', 'gpu', 'display', 'keyboard', 'touchpad', 'motherboard', 'battery', 'network_adapter'];

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
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">Inventory</h1>
                    <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">Hardware and software inventory overview</p>
                </div>
                <button
                    onClick={() => {
                        loadStats();
                        if (activeTab === 'hardware') loadHardware();
                        if (activeTab === 'software') loadSoftware();
                        toast.success('Inventory refreshed');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'overview'
                                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('hardware')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'hardware'
                                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            Hardware
                        </button>
                        <button
                            onClick={() => setActiveTab('software')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'software'
                                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            Software
                        </button>
                    </nav>
                </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
                <div className="space-y-6">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Devices</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_devices || 0}</p>
                                </div>
                                <div className="bg-blue-500 p-3 rounded-lg">
                                    <Monitor className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Hardware Items</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_hardware_items || 0}</p>
                                </div>
                                <div className="bg-green-500 p-3 rounded-lg">
                                    <HardDrive className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Software Items</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_software_items || 0}</p>
                                </div>
                                <div className="bg-purple-500 p-3 rounded-lg">
                                    <Package className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Unique Software</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.unique_software || 0}</p>
                                </div>
                                <div className="bg-orange-500 p-3 rounded-lg">
                                    <BarChart3 className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hardware by Type */}
                    {stats.hardware_by_type && Object.keys(stats.hardware_by_type).length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Hardware by Type</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Object.entries(stats.hardware_by_type).map(([type, count]) => (
                                    <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{type}</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Software by Publisher */}
                    {stats.software_by_publisher && Object.keys(stats.software_by_publisher).length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Software by Publisher</h2>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {Object.entries(stats.software_by_publisher)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 20)
                                    .map(([publisher, count]) => (
                                        <div key={publisher} className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                                            <p className="text-sm text-gray-700">{publisher || 'Unknown'}</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{count}</p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Hardware Tab */}
            {activeTab === 'hardware' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search hardware..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPagination(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
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
                            <select
                                value={filters.component_type}
                                onChange={(e) => {
                                    setFilters(prev => ({ ...prev, component_type: e.target.value }));
                                    setPagination(prev => ({ ...prev, page: 1 }));
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Types</option>
                                {componentTypes.map(type => (
                                    <option key={type} value={type}>
                                        {type.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Hardware Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Component
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Manufacturer
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Model
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Capacity
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Device
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Serial Number
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center">
                                                <div className="flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : hardware.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                No hardware found
                                            </td>
                                        </tr>
                                    ) : (
                                        hardware.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {getComponentIcon(item.component_type)}
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                                            {item.component_type}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {item.manufacturer || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {item.model || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {item.capacity || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.Device ? (
                                                        <Link
                                                            to={`/devices/${item.Device.id}`}
                                                            className="text-sm text-blue-600 hover:text-blue-800"
                                                        >
                                                            {item.Device.hostname || 'Unknown'}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.serial_number || 'N/A'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                                <div className="text-sm text-gray-700">
                                    Showing page {pagination.page} of {pagination.pages} ({pagination.total} total items)
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
                    </div>
                </div>
            )}

            {/* Software Tab */}
            {activeTab === 'software' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search software..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPagination(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
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
                            <select
                                value={filters.is_system}
                                onChange={(e) => {
                                    setFilters(prev => ({ ...prev, is_system: e.target.value }));
                                    setPagination(prev => ({ ...prev, page: 1 }));
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Software</option>
                                <option value="true">System Software</option>
                                <option value="false">User Software</option>
                            </select>
                        </div>
                    </div>

                    {/* Software Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Software
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Version
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Publisher
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Size
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Device
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center">
                                                <div className="flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : software.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                No software found
                                            </td>
                                        </tr>
                                    ) : (
                                        software.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-5 h-5 text-gray-400" />
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {item.version || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {item.publisher || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {formatBytes(item.size_bytes)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.Device ? (
                                                        <Link
                                                            to={`/devices/${item.Device.id}`}
                                                            className="text-sm text-blue-600 hover:text-blue-800"
                                                        >
                                                            {item.Device.hostname || 'Unknown'}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                        item.is_system
                                                            ? 'bg-gray-100 text-gray-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {item.is_system ? 'System' : 'User'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                                <div className="text-sm text-gray-700">
                                    Showing page {pagination.page} of {pagination.pages} ({pagination.total} total items)
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
