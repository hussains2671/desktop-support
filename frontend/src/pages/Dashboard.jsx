import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Monitor, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        totalAlerts: 0,
        criticalAlerts: 0
    });
    const [performanceData, setPerformanceData] = useState([]);
    const [recentAlerts, setRecentAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [devicesRes, alertsRes] = await Promise.all([
                api.get('/devices'),
                api.get('/alerts?limit=5')
            ]);

            const devices = devicesRes.data.data;
            const onlineCount = devices.filter(d => d.Agent?.status === 'online').length;
            
            setStats({
                totalDevices: devices.length,
                onlineDevices: onlineCount,
                offlineDevices: devices.length - onlineCount,
                totalAlerts: alertsRes.data.data.length,
                criticalAlerts: alertsRes.data.data.filter(a => a.severity === 'critical').length
            });

            setRecentAlerts(alertsRes.data.data);
            setError(null);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            setError(error.response?.data?.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Devices',
            value: stats.totalDevices,
            icon: Monitor,
            color: 'blue',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-600'
        },
        {
            title: 'Online Devices',
            value: stats.onlineDevices,
            icon: CheckCircle,
            color: 'green',
            bgColor: 'bg-green-100',
            textColor: 'text-green-600'
        },
        {
            title: 'Offline Devices',
            value: stats.offlineDevices,
            icon: XCircle,
            color: 'red',
            bgColor: 'bg-red-100',
            textColor: 'text-red-600'
        },
        {
            title: 'Active Alerts',
            value: stats.totalAlerts,
            icon: AlertTriangle,
            color: 'yellow',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-600'
        }
    ];

    if (loading) {
        return <LoadingSpinner size="lg" text="Loading dashboard..." />;
    }

    if (error) {
        return (
            <ErrorDisplay 
                error={error} 
                onRetry={loadDashboardData}
                title="Failed to Load Dashboard"
            />
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Overview of your system</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                                </div>
                                <div className={`${stat.bgColor} p-3 rounded-full`}>
                                    <Icon className={`w-6 h-6 ${stat.textColor}`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Performance Metrics</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={performanceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" />
                            <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memory %" />
                            <Line type="monotone" dataKey="disk" stroke="#f59e0b" name="Disk %" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Alerts</h2>
                    <div className="space-y-3">
                        {recentAlerts.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent alerts</p>
                        ) : (
                            recentAlerts.map((alert) => (
                                <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                                        alert.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                                        alert.severity === 'high' ? 'text-orange-600 dark:text-orange-400' :
                                        'text-yellow-600 dark:text-yellow-400'
                                    }`} />
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white">{alert.title}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{alert.message}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {new Date(alert.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

