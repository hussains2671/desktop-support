import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';
import {
    Server,
    Search,
    RefreshCw,
    Edit,
    Trash2,
    Key,
    RotateCw,
    Eye,
    X,
    CheckCircle,
    XCircle,
    AlertCircle,
    Monitor,
    Clock,
    Globe
} from 'lucide-react';

const Agents = () => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [showRotateModal, setShowRotateModal] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });

    const [editForm, setEditForm] = useState({
        hostname: '',
        status: 'online',
        agent_version: ''
    });

    useEffect(() => {
        loadAgents();
    }, [pagination.page, statusFilter, searchTerm]);

    const loadAgents = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (searchTerm) params.search = searchTerm;

            const response = await api.get('/agent', { params });
            setAgents(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
        } catch (error) {
            console.error('Failed to load agents:', error);
            toast.error('Failed to load agents');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (agent) => {
        setSelectedAgent(agent);
        setEditForm({
            hostname: agent.hostname || '',
            status: agent.status || 'online',
            agent_version: agent.agent_version || ''
        });
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        try {
            const response = await api.put(`/agent/${selectedAgent.id}`, editForm);
            toast.success('Agent updated successfully');
            setShowEditModal(false);
            setSelectedAgent(null);
            loadAgents();
        } catch (error) {
            console.error('Failed to update agent:', error);
            toast.error(error.response?.data?.message || 'Failed to update agent');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/agent/${selectedAgent.id}`);
            toast.success('Agent deleted successfully');
            setShowDeleteModal(false);
            setSelectedAgent(null);
            loadAgents();
        } catch (error) {
            console.error('Failed to delete agent:', error);
            toast.error(error.response?.data?.message || 'Failed to delete agent');
        }
    };

    const handleRevoke = async () => {
        try {
            const response = await api.post(`/agent/${selectedAgent.id}/revoke`);
            toast.success('Agent key revoked successfully. New key: ' + response.data.data.new_agent_key.substring(0, 16) + '...');
            setShowRevokeModal(false);
            setSelectedAgent(null);
            loadAgents();
        } catch (error) {
            console.error('Failed to revoke agent key:', error);
            toast.error(error.response?.data?.message || 'Failed to revoke agent key');
        }
    };

    const handleRotate = async () => {
        try {
            const response = await api.post(`/agent/${selectedAgent.id}/rotate-key`);
            toast.success('Agent key rotated successfully. New key: ' + response.data.data.new_agent_key.substring(0, 16) + '...');
            setShowRotateModal(false);
            setSelectedAgent(null);
            loadAgents();
        } catch (error) {
            console.error('Failed to rotate agent key:', error);
            toast.error(error.response?.data?.message || 'Failed to rotate agent key');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            online: {
                icon: CheckCircle,
                color: 'bg-green-100 text-green-800 border-green-200',
                label: 'Online'
            },
            offline: {
                icon: XCircle,
                color: 'bg-gray-100 text-gray-800 border-gray-200 dark:border-gray-700',
                label: 'Offline'
            },
            error: {
                icon: AlertCircle,
                color: 'bg-red-100 text-red-800 border-red-200',
                label: 'Error'
            }
        };
        const badge = badges[status] || badges.offline;
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border ${badge.color}`}>
                <Icon className="w-3 h-3" />
                {badge.label}
            </span>
        );
    };

    const formatLastHeartbeat = (date) => {
        if (!date) return 'Never';
        const now = new Date();
        const heartbeat = new Date(date);
        const diff = Math.floor((now - heartbeat) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agents</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and monitor your agents</p>
                </div>
                <button
                    onClick={() => {
                        loadAgents();
                        toast.success('Agents refreshed');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search agents by hostname, device ID, or IP..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Status</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                        <option value="error">Error</option>
                    </select>
                </div>
            </div>

            {/* Agents Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Agent
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Device
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Version
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Heartbeat
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    IP Address
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : agents.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No agents found
                                    </td>
                                </tr>
                            ) : (
                                agents.map((agent) => (
                                    <tr key={agent.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Server className="w-5 h-5 text-gray-400" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {agent.hostname || 'Unknown'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        ID: {agent.device_id}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {agent.Device ? (
                                                <Link
                                                    to={`/devices/${agent.Device.id}`}
                                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                >
                                                    <Monitor className="w-4 h-4" />
                                                    {agent.Device.hostname || 'Unknown'}
                                                </Link>
                                            ) : (
                                                <span className="text-sm text-gray-500">No device</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(agent.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {agent.agent_version || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <Clock className="w-4 h-4" />
                                                {formatLastHeartbeat(agent.last_heartbeat)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <Globe className="w-4 h-4" />
                                                {agent.ip_address || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedAgent(agent);
                                                        setShowDetailsModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-900 p-1"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(agent)}
                                                    className="text-green-600 hover:text-green-900 p-1"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedAgent(agent);
                                                        setShowRotateModal(true);
                                                    }}
                                                    className="text-purple-600 hover:text-purple-900 p-1"
                                                    title="Rotate Key"
                                                >
                                                    <RotateCw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedAgent(agent);
                                                        setShowRevokeModal(true);
                                                    }}
                                                    className="text-orange-600 hover:text-orange-900 p-1"
                                                    title="Revoke Key"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedAgent(agent);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="text-red-600 hover:text-red-900 p-1"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
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
                            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total agents)
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

            {/* Details Modal */}
            {showDetailsModal && selectedAgent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agent Details</h2>
                            <button
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    setSelectedAgent(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Hostname</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{selectedAgent.hostname || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Device ID</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{selectedAgent.device_id}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                                    <dd className="mt-1">{getStatusBadge(selectedAgent.status)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Agent Version</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{selectedAgent.agent_version || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">OS Version</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{selectedAgent.os_version || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">IP Address</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{selectedAgent.ip_address || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Last Heartbeat</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                                        {selectedAgent.last_heartbeat
                                            ? new Date(selectedAgent.last_heartbeat).toLocaleString()
                                            : 'Never'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                                        {selectedAgent.created_at
                                            ? new Date(selectedAgent.created_at).toLocaleString()
                                            : 'N/A'}
                                    </dd>
                                </div>
                                {selectedAgent.Device && (
                                    <>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Device</dt>
                                            <dd className="mt-1">
                                                <Link
                                                    to={`/devices/${selectedAgent.Device.id}`}
                                                    className="text-sm text-blue-600 hover:text-blue-800"
                                                >
                                                    {selectedAgent.Device.hostname || 'Unknown'}
                                                </Link>
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Device Status</dt>
                                            <dd className="mt-1">{getStatusBadge(selectedAgent.Device.status)}</dd>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        setSelectedAgent(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedAgent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Agent</h2>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedAgent(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Hostname
                                </label>
                                <input
                                    type="text"
                                    value={editForm.hostname}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, hostname: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                    <option value="error">Error</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Agent Version
                                </label>
                                <input
                                    type="text"
                                    value={editForm.agent_version}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, agent_version: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleUpdate}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Update
                                </button>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedAgent(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedAgent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delete Agent</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Are you sure you want to delete agent <strong>{selectedAgent.hostname || selectedAgent.device_id}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setSelectedAgent(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Revoke Key Modal */}
            {showRevokeModal && selectedAgent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Revoke Agent Key</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Are you sure you want to revoke the key for agent <strong>{selectedAgent.hostname || selectedAgent.device_id}</strong>? A new key will be generated and the agent will be set to offline status.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRevoke}
                                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                >
                                    Revoke Key
                                </button>
                                <button
                                    onClick={() => {
                                        setShowRevokeModal(false);
                                        setSelectedAgent(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rotate Key Modal */}
            {showRotateModal && selectedAgent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Rotate Agent Key</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Are you sure you want to rotate the key for agent <strong>{selectedAgent.hostname || selectedAgent.device_id}</strong>? A new key will be generated.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRotate}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    Rotate Key
                                </button>
                                <button
                                    onClick={() => {
                                        setShowRotateModal(false);
                                        setSelectedAgent(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Agents;

