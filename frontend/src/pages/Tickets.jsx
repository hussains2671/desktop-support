import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    Ticket as TicketIcon,
    Search,
    Filter,
    Plus,
    Eye,
    Edit,
    Trash2,
    MessageSquare,
    Clock,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    RefreshCw,
    X
} from 'lucide-react';
import BulkActions from '../components/Common/BulkActions';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';

const Tickets = () => {
    const [tickets, setTickets] = useState([]);
    const [stats, setStats] = useState({
        totalTickets: 0,
        openTickets: 0,
        closedTickets: 0,
        inProgressTickets: 0,
        highPriorityTickets: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTickets, setSelectedTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        assigned_to: 'all'
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });
    const [devices, setDevices] = useState([]);
    const [users, setUsers] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        device_id: '',
        assigned_to: ''
    });

    useEffect(() => {
        loadTickets();
        loadStats();
        loadDevices();
        loadUsers();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            loadTickets();
            loadStats();
        }, 30000);

        return () => clearInterval(interval);
    }, [filters, pagination.page]);

    const loadTickets = async () => {
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };

            if (filters.status !== 'all') params.status = filters.status;
            if (filters.priority !== 'all') params.priority = filters.priority;
            if (filters.assigned_to !== 'all') params.assigned_to = filters.assigned_to;
            if (searchTerm) params.search = searchTerm;

            const response = await api.get('/tickets', { params });
            setTickets(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
            setError(null);
        } catch (error) {
            console.error('Failed to load tickets:', error);
            setError(error.response?.data?.message || 'Failed to load tickets');
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await api.get('/tickets/stats');
            setStats(response.data.data || {});
        } catch (error) {
            console.error('Failed to load ticket stats:', error);
        }
    };

    const loadDevices = async () => {
        try {
            const response = await api.get('/devices?limit=100');
            setDevices(response.data.data || []);
        } catch (error) {
            console.error('Failed to load devices:', error);
        }
    };

    const loadUsers = async () => {
        try {
            const response = await api.get('/admin/users?limit=100');
            setUsers(response.data.data || []);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        
        if (!formData.title || !formData.description || !formData.priority) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            await api.post('/tickets', {
                ...formData,
                device_id: formData.device_id || null,
                assigned_to: formData.assigned_to || null
            });
            toast.success('Ticket created successfully');
            setFormData({
                title: '',
                description: '',
                priority: 'medium',
                device_id: '',
                assigned_to: ''
            });
            setShowCreateModal(false);
            loadTickets();
            loadStats();
        } catch (error) {
            console.error('Failed to create ticket:', error);
            toast.error(error.response?.data?.message || 'Failed to create ticket');
        }
    };

    const handleViewDetails = async (ticketId) => {
        try {
            const response = await api.get(`/tickets/${ticketId}`);
            setSelectedTicket(response.data.data);
            setShowDetails(true);
        } catch (error) {
            console.error('Failed to load ticket details:', error);
            toast.error('Failed to load ticket details');
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) {
            toast.error('Comment cannot be empty');
            return;
        }

        try {
            await api.post(`/tickets/${selectedTicket.id}/comments`, {
                comment_text: newComment
            });
            toast.success('Comment added successfully');
            setNewComment('');
            // Reload ticket details
            const response = await api.get(`/tickets/${selectedTicket.id}`);
            setSelectedTicket(response.data.data);
        } catch (error) {
            console.error('Failed to add comment:', error);
            toast.error('Failed to add comment');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            await api.delete(`/tickets/${selectedTicket.id}/comments/${commentId}`);
            toast.success('Comment deleted successfully');
            // Reload ticket details
            const response = await api.get(`/tickets/${selectedTicket.id}`);
            setSelectedTicket(response.data.data);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            toast.error('Failed to delete comment');
        }
    };

    const handleDeleteTicket = async (ticketId) => {
        if (!window.confirm('Are you sure you want to delete this ticket? This cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/tickets/${ticketId}`);
            toast.success('Ticket deleted successfully');
            setShowDetails(false);
            loadTickets();
            loadStats();
        } catch (error) {
            console.error('Failed to delete ticket:', error);
            toast.error('Failed to delete ticket');
        }
    };

    const handleUpdateTicket = async (updates) => {
        try {
            await api.put(`/tickets/${selectedTicket.id}`, updates);
            toast.success('Ticket updated successfully');
            // Reload ticket details
            const response = await api.get(`/tickets/${selectedTicket.id}`);
            setSelectedTicket(response.data.data);
            loadTickets();
            loadStats();
        } catch (error) {
            console.error('Failed to update ticket:', error);
            toast.error('Failed to update ticket');
        }
    };

    const getPriorityBadge = (priority) => {
        const colors = {
            high: 'bg-red-100 text-red-800 border-red-200',
            medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            low: 'bg-green-100 text-green-800 border-green-200'
        };
        return colors[priority] || colors.medium;
    };

    const getStatusBadge = (status) => {
        const badges = {
            open: {
                icon: AlertCircle,
                color: 'bg-blue-100 text-blue-800',
                label: 'Open'
            },
            in_progress: {
                icon: Clock,
                color: 'bg-yellow-100 text-yellow-800',
                label: 'In Progress'
            },
            closed: {
                icon: CheckCircle,
                color: 'bg-green-100 text-green-800',
                label: 'Closed'
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

    const filteredTickets = tickets.filter(ticket => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            ticket.title?.toLowerCase().includes(searchLower) ||
            ticket.ticket_number?.toLowerCase().includes(searchLower) ||
            ticket.description?.toLowerCase().includes(searchLower)
        );
    });

    const statCards = [
        {
            title: 'Total Tickets',
            value: stats.totalTickets || 0,
            icon: TicketIcon,
            color: 'bg-blue-500'
        },
        {
            title: 'Open',
            value: stats.openTickets || 0,
            icon: AlertCircle,
            color: 'bg-red-500'
        },
        {
            title: 'In Progress',
            value: stats.inProgressTickets || 0,
            icon: Clock,
            color: 'bg-yellow-500'
        },
        {
            title: 'High Priority',
            value: stats.highPriorityTickets || 0,
            icon: AlertCircle,
            color: 'bg-orange-500'
        }
    ];

    if (loading && tickets.length === 0) {
        return <LoadingSpinner size="lg" text="Loading tickets..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tickets</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage support tickets and track issues</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            loadTickets();
                            loadStats();
                            toast.success('Tickets refreshed');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Ticket
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={(e) => {
                            setFilters(prev => ({ ...prev, status: e.target.value }));
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="closed">Closed</option>
                    </select>

                    {/* Priority Filter */}
                    <select
                        value={filters.priority}
                        onChange={(e) => {
                            setFilters(prev => ({ ...prev, priority: e.target.value }));
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Priority</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            {error && tickets.length === 0 && (
                <ErrorDisplay 
                    error={error} 
                    onRetry={loadTickets}
                    title="Failed to Load Tickets"
                />
            )}

            {/* Tickets Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Ticket</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Title</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Status</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Priority</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Device</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Comments</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Created</th>
                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTickets.map(ticket => (
                            <tr key={ticket.id} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <td className="px-6 py-4 text-sm font-mono text-gray-900 dark:text-white">{ticket.ticket_number}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{ticket.title}</td>
                                <td className="px-6 py-4 text-sm">{getStatusBadge(ticket.status)}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(ticket.priority)}`}>
                                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{ticket.Device?.hostname || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                        <MessageSquare className="w-4 h-4" />
                                        {ticket.Comments?.length || 0}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(ticket.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => handleViewDetails(ticket.id)}
                                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                            title="View details"
                                        >
                                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTicket(ticket.id)}
                                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                                            title="Delete ticket"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredTickets.length === 0 && (
                    <div className="text-center py-12">
                        <TicketIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No tickets found</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex justify-center gap-2">
                    <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                        Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                        disabled={pagination.page === pagination.pages}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Ticket</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ticket title"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="Detailed description"
                                    rows="4"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Priority *
                                </label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Device (Optional)
                                </label>
                                <select
                                    value={formData.device_id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, device_id: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select device</option>
                                    {devices.map(device => (
                                        <option key={device.id} value={device.id}>
                                            {device.hostname}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Assign To (Optional)
                                </label>
                                <select
                                    value={formData.assigned_to}
                                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select user</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.first_name} {user.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Create Ticket
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Ticket Details Modal */}
            {showDetails && selectedTicket && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTicket.ticket_number}</h2>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Ticket Info */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{selectedTicket.title}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                                        <div className="mt-1">{getStatusBadge(selectedTicket.status)}</div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Priority</p>
                                        <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(selectedTicket.priority)}`}>
                                            {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Device</p>
                                        <p className="text-gray-900 dark:text-white mt-1">{selectedTicket.Device?.hostname || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Assigned To</p>
                                        <p className="text-gray-900 dark:text-white mt-1">
                                            {selectedTicket.AssignedTo ? `${selectedTicket.AssignedTo.first_name} ${selectedTicket.AssignedTo.last_name}` : 'Unassigned'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h4>
                                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{selectedTicket.description}</p>
                            </div>

                            {/* Change Status */}
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Update Status</h4>
                                <div className="flex gap-2">
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleUpdateTicket({ status: e.target.value });
                                            }
                                        }}
                                        value={selectedTicket.status}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                            </div>

                            {/* Comments */}
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Comments</h4>
                                
                                {/* Comment List */}
                                <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
                                    {selectedTicket.Comments && selectedTicket.Comments.length > 0 ? (
                                        selectedTicket.Comments.map(comment => (
                                            <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {comment.CreatedBy?.first_name} {comment.CreatedBy?.last_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {new Date(comment.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </button>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300">{comment.comment_text}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-600 dark:text-gray-400 text-center py-4">No comments yet</p>
                                    )}
                                </div>

                                {/* Add Comment */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddComment();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Comment
                                    </button>
                                </div>
                            </div>

                            {/* History */}
                            {selectedTicket.History && selectedTicket.History.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Change History</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {selectedTicket.History.map(history => (
                                            <div key={history.id} className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                                <p>
                                                    <span className="font-medium">{history.ChangedBy?.first_name} {history.ChangedBy?.last_name}</span> changed {history.field_changed} 
                                                    {history.old_value && ` from "${history.old_value}"`} to "{history.new_value}"
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                                    {new Date(history.changed_at).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
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

export default Tickets;
