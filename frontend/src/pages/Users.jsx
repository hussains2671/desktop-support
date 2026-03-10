import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Users as UsersIcon, UserPlus, Mail, Shield, Edit, Trash2, Key, Power, Search, X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import BulkActions from '../components/Common/BulkActions';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const { user: currentUser } = useAuthStore();

    const [userForm, setUserForm] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'viewer',
        is_active: true
    });

    const [passwordForm, setPasswordForm] = useState({
        new_password: '',
        confirm_password: ''
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/users');
            setUsers(response.data.data || []);
            setError(null);
        } catch (error) {
            console.error('Failed to load users:', error);
            setError(error.response?.data?.message || 'Failed to load users');
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        try {
            if (!userForm.email || !userForm.password) {
                toast.error('Email and password are required');
                return;
            }

            if (userForm.password.length < 6) {
                toast.error('Password must be at least 6 characters');
                return;
            }

            await api.post('/admin/users', userForm);
            toast.success('User created successfully');
            setShowAddModal(false);
            setUserForm({
                email: '',
                password: '',
                first_name: '',
                last_name: '',
                role: 'viewer',
                is_active: true
            });
            loadUsers();
        } catch (error) {
            console.error('Failed to create user:', error);
            toast.error(error.response?.data?.message || 'Failed to create user');
        }
    };

    const handleEditUser = async () => {
        try {
            if (!selectedUser) return;

            const updateData = {
                email: userForm.email,
                first_name: userForm.first_name,
                last_name: userForm.last_name,
                role: userForm.role,
                is_active: userForm.is_active
            };

            await api.put(`/admin/users/${selectedUser.id}`, updateData);
            toast.success('User updated successfully');
            setShowEditModal(false);
            setSelectedUser(null);
            loadUsers();
        } catch (error) {
            console.error('Failed to update user:', error);
            toast.error(error.response?.data?.message || 'Failed to update user');
        }
    };

    const handleDeleteUser = async () => {
        try {
            if (!selectedUser) return;

            await api.delete(`/admin/users/${selectedUser.id}`);
            toast.success('User deleted successfully');
            setShowDeleteModal(false);
            setSelectedUser(null);
            loadUsers();
        } catch (error) {
            console.error('Failed to delete user:', error);
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleResetPassword = async () => {
        try {
            if (!selectedUser) return;

            if (!passwordForm.new_password || passwordForm.new_password.length < 6) {
                toast.error('Password must be at least 6 characters');
                return;
            }

            if (passwordForm.new_password !== passwordForm.confirm_password) {
                toast.error('Passwords do not match');
                return;
            }

            await api.post(`/admin/users/${selectedUser.id}/reset-password`, {
                new_password: passwordForm.new_password
            });
            toast.success('Password reset successfully');
            setShowPasswordModal(false);
            setSelectedUser(null);
            setPasswordForm({ new_password: '', confirm_password: '' });
        } catch (error) {
            console.error('Failed to reset password:', error);
            toast.error(error.response?.data?.message || 'Failed to reset password');
        }
    };

    const handleToggleActive = async (user) => {
        try {
            await api.put(`/admin/users/${user.id}/activate`, {
                is_active: !user.is_active
            });
            toast.success(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
            loadUsers();
        } catch (error) {
            console.error('Failed to toggle user status:', error);
            toast.error(error.response?.data?.message || 'Failed to update user status');
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setUserForm({
            email: user.email,
            password: '',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            role: user.role,
            is_active: user.is_active
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (user) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setPasswordForm({ new_password: '', confirm_password: '' });
        setShowPasswordModal(true);
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'super_admin':
                return 'bg-red-100 text-red-800';
            case 'admin':
                return 'bg-purple-100 text-purple-800';
            case 'company_admin':
                return 'bg-blue-100 text-blue-800';
            case 'technician':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const canManageUsers = currentUser?.role === 'super_admin' || 
                          currentUser?.role === 'admin' || 
                          currentUser?.role === 'company_admin';

    const filteredUsers = users.filter(user => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            user.email?.toLowerCase().includes(searchLower) ||
            user.first_name?.toLowerCase().includes(searchLower) ||
            user.last_name?.toLowerCase().includes(searchLower) ||
            user.role?.toLowerCase().includes(searchLower)
        );
    });

    if (loading) {
        return <LoadingSpinner size="lg" text="Loading users..." />;
    }

    if (error) {
        return (
            <ErrorDisplay 
                error={error} 
                onRetry={loadUsers}
                title="Failed to Load Users"
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage user accounts</p>
                </div>
                {canManageUsers && (
                    <button
                        onClick={() => {
                            setUserForm({
                                email: '',
                                password: '',
                                first_name: '',
                                last_name: '',
                                role: 'viewer',
                                is_active: true
                            });
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <UserPlus className="w-5 h-5" />
                        Add User
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search users by name, email, or role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {canManageUsers && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedUsers(filteredUsers.map(u => u.id));
                                                } else {
                                                    setSelectedUsers([]);
                                                }
                                            }}
                                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Login
                                </th>
                                {canManageUsers && (
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={canManageUsers ? 7 : 6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        {canManageUsers && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedUsers([...selectedUsers, user.id]);
                                                        } else {
                                                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                                        }
                                                    }}
                                                    disabled={user.id === currentUser?.id}
                                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-blue-600 dark:bg-blue-700 rounded-full flex items-center justify-center text-white font-medium">
                                                    {user.first_name?.[0] || user.email[0].toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-900 dark:text-white">
                                                <Mail className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)} dark:opacity-80`}>
                                                {user.role?.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                disabled={user.id === currentUser?.id}
                                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full transition-colors ${
                                                    user.is_active
                                                        ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60'
                                                        : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60'
                                                } ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                title={user.id === currentUser?.id ? 'Cannot deactivate your own account' : ''}
                                            >
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.last_login
                                                ? new Date(user.last_login).toLocaleString()
                                                : 'Never'
                                            }
                                        </td>
                                        {canManageUsers && (
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1"
                                                        title="Edit User"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openPasswordModal(user)}
                                                        className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300 p-1"
                                                        title="Reset Password"
                                                    >
                                                        <Key className="w-4 h-4" />
                                                    </button>
                                                    {user.id !== currentUser?.id && (
                                                        <button
                                                            onClick={() => openDeleteModal(user)}
                                                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bulk Actions */}
            {canManageUsers && (
                <BulkActions
                    selectedItems={selectedUsers}
                    onBulkDelete={async () => {
                        // Filter out current user from deletion
                        const usersToDelete = selectedUsers.filter(id => id !== currentUser?.id);
                        if (usersToDelete.length === 0) {
                            toast.error('Cannot delete your own account');
                            return;
                        }
                        if (window.confirm(`Are you sure you want to delete ${usersToDelete.length} user(s)?`)) {
                            try {
                                await Promise.all(usersToDelete.map(id => api.delete(`/admin/users/${id}`)));
                                toast.success(`Deleted ${usersToDelete.length} user(s)`);
                                setSelectedUsers([]);
                                loadUsers();
                            } catch (error) {
                                toast.error('Failed to delete users');
                            }
                        }
                    }}
                    onBulkEdit={async () => {
                        // Bulk edit could open a modal to change role or status for all selected users
                        toast.info('Bulk edit feature coming soon');
                    }}
                    onClearSelection={() => setSelectedUsers([])}
                    availableActions={['delete', 'edit']}
                />
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={userForm.email}
                                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={userForm.password}
                                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={userForm.first_name}
                                        onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={userForm.last_name}
                                        onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Role
                                </label>
                                <select
                                    value={userForm.role}
                                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="technician">Technician</option>
                                    {currentUser?.role === 'super_admin' && <option value="company_admin">Company Admin</option>}
                                    {currentUser?.role === 'super_admin' && <option value="admin">Admin</option>}
                                </select>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={userForm.is_active}
                                    onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                                    className="mr-2"
                                />
                                <label className="text-sm text-gray-700">Active</label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleAddUser}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Create User
                                </button>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedUser(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={userForm.email}
                                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={userForm.first_name}
                                        onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={userForm.last_name}
                                        onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Role
                                </label>
                                <select
                                    value={userForm.role}
                                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                    disabled={selectedUser.id === currentUser?.id && currentUser?.role !== 'super_admin'}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="technician">Technician</option>
                                    {currentUser?.role === 'super_admin' && <option value="company_admin">Company Admin</option>}
                                    {currentUser?.role === 'super_admin' && <option value="admin">Admin</option>}
                                </select>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={userForm.is_active}
                                    onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                                    disabled={selectedUser.id === currentUser?.id}
                                    className="mr-2 disabled:opacity-50"
                                />
                                <label className="text-sm text-gray-700">Active</label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleEditUser}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Update User
                                </button>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedUser(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Delete User</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">
                                Are you sure you want to delete user <strong>{selectedUser.email}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDeleteUser}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setSelectedUser(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showPasswordModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
                            <button
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setSelectedUser(null);
                                    setPasswordForm({ new_password: '', confirm_password: '' });
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                Reset password for <strong>{selectedUser.email}</strong>
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Password *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordForm.new_password}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm Password *
                                </label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={passwordForm.confirm_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleResetPassword}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Reset Password
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setSelectedUser(null);
                                        setPasswordForm({ new_password: '', confirm_password: '' });
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

export default Users;
