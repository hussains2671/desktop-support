import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';
import { Bell, CheckCircle2, Filter, RefreshCw, Settings, Mail, BellRing } from 'lucide-react';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [pagination, setPagination] = useState({ total: 0, pages: 0 });
    const [filters, setFilters] = useState({ status: 'open', severity: 'all', search: '' });
    const [selected, setSelected] = useState(new Set());
    const [showPrefs, setShowPrefs] = useState(false);
    const [prefs, setPrefs] = useState({ email_enabled: false, in_app_enabled: true, severities: ['critical','high','medium'] });

    useEffect(() => { load(); }, [page, filters.status, filters.severity]);

    const load = async () => {
        try {
            setLoading(true);
            const params = { page, limit };
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.severity !== 'all') params.severity = filters.severity;
            if (filters.search) params.search = filters.search;
            const res = await api.get('/notifications', { params });
            setNotifications(res.data.data || []);
            setPagination({ total: res.data.pagination?.total || 0, pages: res.data.pagination?.pages || 0 });
        } catch (e) {
            console.error(e);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const loadPrefs = async () => {
        try {
            const res = await api.get('/notifications/preferences');
            setPrefs(res.data.data || prefs);
        } catch {}
    };

    const savePrefs = async () => {
        try {
            await api.put('/notifications/preferences', prefs);
            toast.success('Preferences saved');
            setShowPrefs(false);
        } catch (e) { toast.error('Failed to save preferences'); }
    };

    const toggleSelect = (id) => {
        const copy = new Set(selected);
        if (copy.has(id)) copy.delete(id); else copy.add(id);
        setSelected(copy);
    };

    const markSelectedRead = async () => {
        if (selected.size === 0) return toast('Select notifications first');
        try {
            await api.post('/notifications/mark-read', { ids: Array.from(selected) });
            toast.success('Marked as read');
            setSelected(new Set());
            load();
        } catch (e) { toast.error('Failed to mark as read'); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">View alerts and manage preferences</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { load(); toast.success('Refreshed'); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <RefreshCw className="w-4 h-4"/> Refresh
                    </button>
                    <button onClick={() => { setShowPrefs(true); loadPrefs(); }} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50">
                        <Settings className="w-4 h-4"/> Preferences
                    </button>
                    <button onClick={markSelectedRead} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <CheckCircle2 className="w-4 h-4"/> Mark Read
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input value={filters.search} onChange={e=>setFilters({...filters, search:e.target.value})} placeholder="Search..." className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"/>
                    <select value={filters.status} onChange={e=>{setPage(1); setFilters({...filters, status:e.target.value});}} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="resolved">Resolved</option>
                    </select>
                    <select value={filters.severity} onChange={e=>{setPage(1); setFilters({...filters, severity:e.target.value});}} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                        <option value="all">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="info">Info</option>
                    </select>
                    <div className="flex items-center text-gray-500"><Filter className="w-4 h-4 mr-2"/>Filters</div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center">Loading...</td></tr>
                            ) : notifications.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No notifications</td></tr>
                            ) : notifications.map(n => (
                                <tr key={n.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4"><input type="checkbox" checked={selected.has(n.id)} onChange={()=>toggleSelect(n.id)} /></td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white capitalize">{n.severity}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-gray-400"/><span className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</span></div>
                                        <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white capitalize">{n.status}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(n.created_at || n.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {pagination.pages > 1 && (
                    <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-700">Page {page} of {pagination.pages} ({pagination.total} total)</div>
                        <div className="flex gap-2">
                            <button onClick={()=>setPage(Math.max(1, page-1))} disabled={page===1} className="px-4 py-2 border rounded-lg disabled:opacity-50">Previous</button>
                            <button onClick={()=>setPage(Math.min(pagination.pages, page+1))} disabled={page===pagination.pages} className="px-4 py-2 border rounded-lg disabled:opacity-50">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {showPrefs && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
                            <button onClick={()=>setShowPrefs(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">×</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={prefs.email_enabled} onChange={e=>setPrefs({...prefs, email_enabled:e.target.checked})} />
                                <span className="flex items-center gap-2"><Mail className="w-4 h-4"/> Email Notifications</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={prefs.in_app_enabled} onChange={e=>setPrefs({...prefs, in_app_enabled:e.target.checked})} />
                                <span className="flex items-center gap-2"><BellRing className="w-4 h-4"/> In-App Notifications</span>
                            </label>
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Severities</p>
                                {['critical','high','medium','low','info'].map(s => (
                                    <label key={s} className="flex items-center gap-2 text-sm capitalize">
                                        <input type="checkbox" checked={prefs.severities.includes(s)} onChange={e=>{
                                            const exists = prefs.severities.includes(s);
                                            const next = exists ? prefs.severities.filter(x=>x!==s) : [...prefs.severities, s];
                                            setPrefs({...prefs, severities: next});
                                        }} /> {s}
                                    </label>
                                ))}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={savePrefs} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                                <button onClick={()=>setShowPrefs(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;
