import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { createCommand, getCommandHistory, cancelCommand } from '../services/commandService';
import toast from 'react-hot-toast';
import {
    Terminal,
    Play,
    History,
    X,
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader,
    Search,
    Filter,
    RefreshCw
} from 'lucide-react';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';

const RemoteCommands = () => {
    const [agents, setAgents] = useState([]);
    const [commands, setCommands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commandLoading, setCommandLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0
    });
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showOutputModal, setShowOutputModal] = useState(false);
    const [selectedCommand, setSelectedCommand] = useState(null);
    
    const [filters, setFilters] = useState({
        agent_id: '',
        status: '',
        page: 1,
        limit: 20
    });
    
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });
    
    const [commandForm, setCommandForm] = useState({
        agent_id: '',
        command_type: 'powershell',
        command_text: '',
        parameters: {},
        priority: 5
    });

    useEffect(() => {
        loadAgents();
        loadCommands();
        const interval = setInterval(() => {
            loadCommands();
        }, 10000); // Poll every 10 seconds
        return () => clearInterval(interval);
    }, [filters]);

    const loadAgents = async () => {
        try {
            const response = await api.get('/agent', { params: { limit: 1000 } });
            setAgents(response.data.data || []);
        } catch (error) {
            console.error('Failed to load agents:', error);
        }
    };

    const loadCommands = async () => {
        try {
            setLoading(true);
            const result = await getCommandHistory(filters);
            if (result.success) {
                setCommands(result.data.commands || []);
                setPagination(result.data.pagination || {});
                
                // Calculate stats
                const allCommands = result.data.commands || [];
                setStats({
                    total: result.data.pagination?.total || 0,
                    pending: allCommands.filter(c => c.status === 'pending').length,
                    running: allCommands.filter(c => c.status === 'running').length,
                    completed: allCommands.filter(c => c.status === 'completed').length,
                    failed: allCommands.filter(c => c.status === 'failed').length
                });
            }
        } catch (error) {
            console.error('Failed to load commands:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCommand = async () => {
        if (!commandForm.agent_id || !commandForm.command_text) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setCommandLoading(true);
            const result = await createCommand(commandForm);
            if (result.success) {
                toast.success('Command created successfully');
                setShowCreateModal(false);
                setCommandForm({
                    agent_id: '',
                    command_type: 'powershell',
                    command_text: '',
                    parameters: {},
                    priority: 5
                });
                loadCommands();
            } else {
                toast.error(result.message || 'Failed to create command');
            }
        } catch (error) {
            toast.error('Failed to create command');
        } finally {
            setCommandLoading(false);
        }
    };

    const handleCancelCommand = async (commandId) => {
        if (!confirm('Are you sure you want to cancel this command?')) {
            return;
        }

        try {
            const result = await cancelCommand(commandId);
            if (result.success) {
                toast.success('Command cancelled successfully');
                loadCommands();
            } else {
                toast.error(result.message || 'Failed to cancel command');
            }
        } catch (error) {
            toast.error('Failed to cancel command');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Pending' },
            running: { icon: Loader, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Running' },
            completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Completed' },
            failed: { icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Failed' },
            cancelled: { icon: X, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', label: 'Cancelled' }
        };
        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                <Icon className="w-3 h-3" />
                {badge.label}
            </span>
        );
    };

    const getCommandTypeLabel = (type) => {
        const labels = {
            chkdsk: 'CHKDSK',
            sfc: 'SFC',
            diskpart: 'DiskPart',
            powershell: 'PowerShell',
            cmd: 'CMD',
            custom: 'Custom'
        };
        return labels[type] || type;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Terminal className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Remote Commands</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Execute commands on remote agents</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Play className="w-4 h-4" />
                    Create Command
                </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Running</div>
                    <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
                    <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
                    <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <select
                            value={filters.agent_id}
                            onChange={(e) => setFilters({ ...filters, agent_id: e.target.value, page: 1 })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Agents</option>
                            {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.hostname || agent.device_id}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="running">Running</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <button
                        onClick={loadCommands}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Commands Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <LoadingSpinner />
                    </div>
                ) : commands.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No commands found
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Agent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Command</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {commands.map(command => (
                                    <tr key={command.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">#{command.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {command.Agent?.hostname || command.Agent?.device_id || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {getCommandTypeLabel(command.command_type)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            <div className="max-w-xs truncate" title={command.command_text}>
                                                {command.command_text}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(command.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(command.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCommand(command);
                                                        setShowOutputModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {command.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleCancelCommand(command.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                            disabled={filters.page === 1}
                            className="px-4 py-2 border rounded-lg disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                            disabled={filters.page >= pagination.pages}
                            className="px-4 py-2 border rounded-lg disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Create Command Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Command</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent *</label>
                                <select
                                    value={commandForm.agent_id}
                                    onChange={(e) => setCommandForm({ ...commandForm, agent_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select Agent</option>
                                    {agents.map(agent => (
                                        <option key={agent.id} value={agent.id}>
                                            {agent.hostname || agent.device_id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Command Type *</label>
                                <select
                                    value={commandForm.command_type}
                                    onChange={(e) => setCommandForm({ ...commandForm, command_type: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="powershell">PowerShell</option>
                                    <option value="cmd">CMD</option>
                                    <option value="chkdsk">CHKDSK</option>
                                    <option value="sfc">SFC</option>
                                    <option value="diskpart">DiskPart</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Command Text *</label>
                                <textarea
                                    value={commandForm.command_text}
                                    onChange={(e) => setCommandForm({ ...commandForm, command_text: e.target.value })}
                                    rows={6}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                    placeholder="Enter command..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority (1-10)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={commandForm.priority}
                                    onChange={(e) => setCommandForm({ ...commandForm, priority: parseInt(e.target.value) || 5 })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleCreateCommand}
                                    disabled={commandLoading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {commandLoading ? 'Creating...' : 'Create Command'}
                                </button>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Output Modal */}
            {showOutputModal && selectedCommand && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Command Output</h2>
                            <button
                                onClick={() => {
                                    setShowOutputModal(false);
                                    setSelectedCommand(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Command Type</div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{getCommandTypeLabel(selectedCommand.command_type)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                                    <div>{getStatusBadge(selectedCommand.status)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Created At</div>
                                    <div className="text-sm text-gray-900 dark:text-white">{new Date(selectedCommand.created_at).toLocaleString()}</div>
                                </div>
                                {selectedCommand.completed_at && (
                                    <div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Completed At</div>
                                        <div className="text-sm text-gray-900 dark:text-white">{new Date(selectedCommand.completed_at).toLocaleString()}</div>
                                    </div>
                                )}
                                {selectedCommand.execution_time_ms && (
                                    <div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Execution Time</div>
                                        <div className="text-sm text-gray-900 dark:text-white">{(selectedCommand.execution_time_ms / 1000).toFixed(2)}s</div>
                                    </div>
                                )}
                                {selectedCommand.exit_code !== null && (
                                    <div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Exit Code</div>
                                        <div className="text-sm text-gray-900 dark:text-white">{selectedCommand.exit_code}</div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Command</div>
                                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm text-gray-900 dark:text-white">
                                    {selectedCommand.command_text}
                                </div>
                            </div>
                            {selectedCommand.result_output && (
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Output</div>
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm text-gray-900 dark:text-white whitespace-pre-wrap max-h-96 overflow-y-auto">
                                        {selectedCommand.result_output}
                                    </div>
                                </div>
                            )}
                            {selectedCommand.result_error && (
                                <div>
                                    <div className="text-sm text-red-500 dark:text-red-400 mb-1">Error</div>
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg font-mono text-sm text-red-900 dark:text-red-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
                                        {selectedCommand.result_error}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RemoteCommands;

