import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';
import {
    FileText,
    BarChart3,
    Download,
    RefreshCw,
    Monitor,
    Cpu,
    HardDrive,
    Package,
    Calendar,
    Filter,
    TrendingUp,
    Activity
} from 'lucide-react';

const Reports = () => {
    const [activeTab, setActiveTab] = useState('devices'); // 'devices', 'performance', 'inventory'
    const [loading, setLoading] = useState(false);
    const [deviceReport, setDeviceReport] = useState(null);
    const [performanceReport, setPerformanceReport] = useState(null);
    const [inventoryReport, setInventoryReport] = useState(null);
    const [devices, setDevices] = useState([]);
    const [filters, setFilters] = useState({
        device_id: 'all',
        start_date: '',
        end_date: '',
        hours: 24
    });

    useEffect(() => {
        loadDevices();
        if (activeTab === 'devices') {
            loadDeviceReport();
        } else if (activeTab === 'performance') {
            loadPerformanceReport();
        } else if (activeTab === 'inventory') {
            loadInventoryReport();
        }
    }, [activeTab, filters]);

    const loadDevices = async () => {
        try {
            const response = await api.get('/devices');
            setDevices(response.data.data || []);
        } catch (error) {
            console.error('Failed to load devices:', error);
        }
    };

    const loadDeviceReport = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.device_id !== 'all') params.device_id = filters.device_id;
            if (filters.start_date) params.start_date = filters.start_date;
            if (filters.end_date) params.end_date = filters.end_date;
            if (filters.status) params.status = filters.status;

            const response = await api.get('/reports/devices', { params });
            setDeviceReport(response.data.data);
        } catch (error) {
            console.error('Failed to load device report:', error);
            toast.error('Failed to load device report');
        } finally {
            setLoading(false);
        }
    };

    const loadPerformanceReport = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.device_id !== 'all') params.device_id = filters.device_id;
            if (filters.start_date) params.start_date = filters.start_date;
            if (filters.end_date) params.end_date = filters.end_date;
            if (!filters.start_date && !filters.end_date) {
                params.hours = filters.hours;
            }

            const response = await api.get('/reports/performance', { params });
            setPerformanceReport(response.data.data);
        } catch (error) {
            console.error('Failed to load performance report:', error);
            toast.error('Failed to load performance report');
        } finally {
            setLoading(false);
        }
    };

    const loadInventoryReport = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.device_id !== 'all') params.device_id = filters.device_id;

            const response = await api.get('/reports/inventory', { params });
            setInventoryReport(response.data.data);
        } catch (error) {
            console.error('Failed to load inventory report:', error);
            toast.error('Failed to load inventory report');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (reportType) => {
        try {
            const params = {
                report_type: reportType,
                format: 'json'
            };
            if (filters.device_id !== 'all') params.device_id = filters.device_id;
            if (filters.start_date) params.start_date = filters.start_date;
            if (filters.end_date) params.end_date = filters.end_date;

            const response = await api.post('/reports/generate', params);
            
            // Convert to JSON and download
            const dataStr = JSON.stringify(response.data.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = window.URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${reportType}-report-${Date.now()}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Report exported successfully');
        } catch (error) {
            console.error('Failed to export report:', error);
            toast.error('Failed to export report');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Generate and view detailed reports</p>
                </div>
                <button
                    onClick={() => {
                        if (activeTab === 'devices') loadDeviceReport();
                        else if (activeTab === 'performance') loadPerformanceReport();
                        else if (activeTab === 'inventory') loadInventoryReport();
                        toast.success('Report refreshed');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('devices')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'devices'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:border-gray-600'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Monitor className="w-4 h-4" />
                                Device Report
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('performance')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'performance'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:border-gray-600'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Performance Report
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'inventory'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:border-gray-600'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <HardDrive className="w-4 h-4" />
                                Inventory Report
                            </div>
                        </button>
                    </nav>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                        value={filters.device_id}
                        onChange={(e) => setFilters(prev => ({ ...prev, device_id: e.target.value }))}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Devices</option>
                        {devices.map(device => (
                            <option key={device.id} value={device.id}>
                                {device.hostname || `Device ${device.id}`}
                            </option>
                        ))}
                    </select>
                    {activeTab !== 'inventory' && (
                        <>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <input
                                    type="date"
                                    value={filters.start_date}
                                    onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Start Date"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <input
                                    type="date"
                                    value={filters.end_date}
                                    onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="End Date"
                                />
                            </div>
                        </>
                    )}
                    {activeTab === 'performance' && !filters.start_date && !filters.end_date && (
                        <select
                            value={filters.hours}
                            onChange={(e) => setFilters(prev => ({ ...prev, hours: parseInt(e.target.value) }))}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value={1}>Last 1 Hour</option>
                            <option value={6}>Last 6 Hours</option>
                            <option value={24}>Last 24 Hours</option>
                            <option value={168}>Last 7 Days</option>
                            <option value={720}>Last 30 Days</option>
                        </select>
                    )}
                </div>
            </div>

            {/* Device Report */}
            {activeTab === 'devices' && (
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : deviceReport ? (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Devices</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{deviceReport.summary?.total || 0}</p>
                                        </div>
                                        <div className="bg-blue-500 p-3 rounded-lg">
                                            <Monitor className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Online</p>
                                            <p className="text-2xl font-bold text-green-600 mt-1">{deviceReport.summary?.online || 0}</p>
                                        </div>
                                        <div className="bg-green-500 p-3 rounded-lg">
                                            <Activity className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Offline</p>
                                            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">{deviceReport.summary?.offline || 0}</p>
                                        </div>
                                        <div className="bg-gray-500 p-3 rounded-lg">
                                            <Monitor className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Warning</p>
                                            <p className="text-2xl font-bold text-yellow-600 mt-1">{deviceReport.summary?.warning || 0}</p>
                                        </div>
                                        <div className="bg-yellow-500 p-3 rounded-lg">
                                            <BarChart3 className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* OS Distribution */}
                            {deviceReport.os_distribution && Object.keys(deviceReport.os_distribution).length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">OS Distribution</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(deviceReport.os_distribution).map(([os, count]) => (
                                            <div key={os} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{os}</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Export Button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleExport('devices')}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Export Report
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                            <p className="text-gray-500">No device report data available</p>
                        </div>
                    )}
                </div>
            )}

            {/* Performance Report */}
            {activeTab === 'performance' && (
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : performanceReport ? (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Avg CPU Usage</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                                {performanceReport.summary?.avg_cpu?.toFixed(1) || 0}%
                                            </p>
                                        </div>
                                        <div className="bg-blue-500 p-3 rounded-lg">
                                            <Cpu className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Memory Usage</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                                {performanceReport.summary?.avg_memory?.toFixed(1) || 0}%
                                            </p>
                                        </div>
                                        <div className="bg-purple-500 p-3 rounded-lg">
                                            <TrendingUp className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Disk Usage</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                                {performanceReport.summary?.avg_disk?.toFixed(1) || 0}%
                                            </p>
                                        </div>
                                        <div className="bg-orange-500 p-3 rounded-lg">
                                            <HardDrive className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Metrics</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{performanceReport.summary?.metrics_count || 0}</p>
                                        </div>
                                        <div className="bg-green-500 p-3 rounded-lg">
                                            <BarChart3 className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Device Summary */}
                            {performanceReport.device_summary && performanceReport.device_summary.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Device Performance Summary</h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg CPU</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max CPU</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Memory</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Memory</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Disk</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metrics</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {performanceReport.device_summary.map((device, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                            {device.device_name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                            {device.avg_cpu?.toFixed(1)}%
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                            {device.max_cpu?.toFixed(1)}%
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                            {device.avg_memory?.toFixed(1)}%
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                            {device.max_memory?.toFixed(1)}%
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                            {device.avg_disk?.toFixed(1)}%
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {device.metrics_count}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Export Button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleExport('performance')}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Export Report
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                            <p className="text-gray-500">No performance report data available</p>
                        </div>
                    )}
                </div>
            )}

            {/* Inventory Report */}
            {activeTab === 'inventory' && (
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : inventoryReport ? (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Hardware</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{inventoryReport.summary?.total_hardware || 0}</p>
                                        </div>
                                        <div className="bg-blue-500 p-3 rounded-lg">
                                            <HardDrive className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Software</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{inventoryReport.summary?.total_software || 0}</p>
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
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{inventoryReport.summary?.unique_software || 0}</p>
                                        </div>
                                        <div className="bg-green-500 p-3 rounded-lg">
                                            <BarChart3 className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Hardware by Type */}
                            {inventoryReport.summary?.hardware_by_type && Object.keys(inventoryReport.summary.hardware_by_type).length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Hardware by Type</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(inventoryReport.summary.hardware_by_type).map(([type, count]) => (
                                            <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{type}</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Software by Publisher */}
                            {inventoryReport.summary?.software_by_publisher && Object.keys(inventoryReport.summary.software_by_publisher).length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Software by Publisher</h2>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {Object.entries(inventoryReport.summary.software_by_publisher)
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

                            {/* Export Button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleExport('inventory')}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Export Report
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                            <p className="text-gray-500">No inventory report data available</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Reports;

