import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';

const DeviceDetails = () => {
    const { id } = useParams();
    const [device, setDevice] = useState(null);
    const [hardware, setHardware] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDeviceDetails();
    }, [id]);

    const loadDeviceDetails = async () => {
        try {
            const [deviceRes, hardwareRes] = await Promise.all([
                api.get(`/devices/${id}`),
                api.get(`/devices/${id}/hardware`)
            ]);

            setDevice(deviceRes.data.data);
            setHardware(hardwareRes.data.data);
            setError(null);
        } catch (error) {
            console.error('Failed to load device details:', error);
            setError(error.response?.data?.message || 'Failed to load device details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingSpinner size="lg" text="Loading device details..." />;
    }

    if (error || !device) {
        return (
            <ErrorDisplay 
                error={error || 'Device not found'} 
                onRetry={loadDeviceDetails}
                title="Failed to Load Device"
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/devices" className="p-2 hover:bg-gray-100 rounded">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{device.hostname || 'Unknown Device'}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Device Details</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">System Information</h2>
                    <dl className="space-y-2">
                        <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Hostname</dt>
                            <dd className="text-sm text-gray-900 dark:text-white">{device.hostname || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</dt>
                            <dd className="text-sm text-gray-900 dark:text-white">{device.username || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">OS</dt>
                            <dd className="text-sm text-gray-900 dark:text-white">{device.os_name} {device.os_version}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Manufacturer</dt>
                            <dd className="text-sm text-gray-900 dark:text-white">{device.manufacturer || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Model</dt>
                            <dd className="text-sm text-gray-900 dark:text-white">{device.model || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Serial Number</dt>
                            <dd className="text-sm text-gray-900 dark:text-white">{device.serial_number || 'N/A'}</dd>
                        </div>
                    </dl>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Hardware Inventory</h2>
                    <div className="space-y-3">
                        {hardware.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400">No hardware data available</p>
                        ) : (
                            hardware.map((item) => (
                                <div key={item.id} className="border-b border-gray-200 dark:border-gray-700 pb-3">
                                    <p className="font-medium text-gray-900 dark:text-white capitalize">{item.component_type}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.manufacturer} {item.model}</p>
                                    {item.serial_number && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">SN: {item.serial_number}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceDetails;

