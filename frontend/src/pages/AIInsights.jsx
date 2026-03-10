import React, { useEffect, useState, useCallback } from 'react';
import FeatureGate from '../components/Common/FeatureGate';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';
import useFeatureStore from '../store/featureStore';
import {
    Brain,
    Sparkles,
    Lightbulb,
    TrendingUp,
    RefreshCw,
    Search,
    Filter,
    Eye,
    X,
    AlertCircle,
    CheckCircle,
    Clock,
    Zap
} from 'lucide-react';

const AIInsights = () => {
    const isFeatureEnabled = useFeatureStore(state => state.isFeatureEnabled('ai_insights'));
    const [insights, setInsights] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
    const [analysisForm, setAnalysisForm] = useState({
        device_id: '',
        hours: 24,
        log_levels: ['critical', 'error']
    });
    const [filters, setFilters] = useState({
        device_id: 'all',
        insight_type: 'all',
        status: 'all'
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });

    const loadInsights = useCallback(async () => {
        // Don't make API calls if feature is not enabled
        if (!isFeatureEnabled) {
            return;
        }

        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };

            if (filters.device_id !== 'all') params.device_id = filters.device_id;
            if (filters.insight_type !== 'all') params.insight_type = filters.insight_type;
            if (filters.status !== 'all') params.status = filters.status;

            const response = await api.get('/ai/insights', { params });
            setInsights(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
        } catch (error) {
            // Don't show error toast for 403 (Forbidden) - it's expected when feature is not available
            if (error.response?.status !== 403) {
                console.error('Failed to load insights:', error);
                toast.error('Failed to load insights');
            }
        } finally {
            setLoading(false);
        }
    }, [isFeatureEnabled, filters, pagination.page, pagination.limit]);

    const loadDevices = useCallback(async () => {
        // Don't make API calls if feature is not enabled
        if (!isFeatureEnabled) {
            return;
        }

        try {
            const response = await api.get('/devices');
            setDevices(response.data.data || []);
        } catch (error) {
            // Don't log errors for 403 (Forbidden) - it's expected when feature is not available
            if (error.response?.status !== 403) {
                console.error('Failed to load devices:', error);
            }
        }
    }, [isFeatureEnabled]);

    useEffect(() => {
        // Only make API calls if the feature is enabled
        if (isFeatureEnabled) {
            loadInsights();
            loadDevices();
        } else {
            // If feature is not enabled, set loading to false to show the FeatureGate fallback
            setLoading(false);
        }
    }, [isFeatureEnabled, loadInsights, loadDevices]);

    const handleAnalyze = async () => {
        if (!analysisForm.device_id) {
            toast.error('Please select a device');
            return;
        }

        try {
            setAnalyzing(true);
            const response = await api.post('/ai/analyze-logs', {
                device_id: parseInt(analysisForm.device_id),
                hours: parseInt(analysisForm.hours),
                log_levels: analysisForm.log_levels
            });

            if (response.data.data) {
                toast.success('Analysis completed successfully!');
                setShowAnalyzeModal(false);
                loadInsights();
                // Show the new insight
                if (response.data.data.insight) {
                    handleViewDetails(response.data.data.insight.id);
                }
            } else {
                toast.info('No critical logs found for analysis');
            }
        } catch (error) {
            console.error('Failed to analyze logs:', error);
            toast.error(error.response?.data?.message || 'Failed to analyze logs');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleViewDetails = async (insightId) => {
        try {
            // Find insight in current list or fetch it
            const insight = insights.find(i => i.id === insightId);
            if (insight) {
                setSelectedInsight(insight);
                setShowDetails(true);
            } else {
                // If not in list, we'd need to fetch it, but for now just show what we have
                toast.error('Insight not found');
            }
        } catch (error) {
            console.error('Failed to load insight details:', error);
            toast.error('Failed to load insight details');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            new: { icon: AlertCircle, color: 'bg-blue-100 text-blue-800', label: 'New' },
            reviewed: { icon: Eye, color: 'bg-yellow-100 text-yellow-800', label: 'Reviewed' },
            applied: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Applied' },
            dismissed: { icon: X, color: 'bg-gray-100 text-gray-800', label: 'Dismissed' }
        };
        const badge = badges[status] || badges.new;
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                <Icon className="w-3 h-3" />
                {badge.label}
            </span>
        );
    };

    const getConfidenceColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (loading && insights.length === 0) {
        return (
            <FeatureGate featureCode="ai_insights">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </FeatureGate>
        );
    }

    return (
        <FeatureGate featureCode="ai_insights">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Insights</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">AI-powered analysis and recommendations</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                if (isFeatureEnabled) {
                                    loadInsights();
                                    toast.success('Insights refreshed');
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowAnalyzeModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Zap className="w-4 h-4" />
                            Analyze Logs
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Insights</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{pagination.total}</p>
                            </div>
                            <div className="bg-blue-500 p-3 rounded-lg">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">New Insights</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {insights.filter(i => i.status === 'new').length}
                                </p>
                            </div>
                            <div className="bg-yellow-500 p-3 rounded-lg">
                                <Lightbulb className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {insights.length > 0
                                        ? Math.round(
                                              insights.reduce((sum, i) => sum + (parseFloat(i.confidence_score) || 0), 0) /
                                                  insights.length
                                          )
                                        : 0}
                                    %
                                </p>
                            </div>
                            <div className="bg-green-500 p-3 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <select
                            value={filters.device_id}
                            onChange={(e) => {
                                setFilters(prev => ({ ...prev, device_id: e.target.value }));
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Devices</option>
                            {devices.map(device => (
                                <option key={device.id} value={device.id}>
                                    {device.hostname || `Device ${device.id}`}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters.status}
                            onChange={(e) => {
                                setFilters(prev => ({ ...prev, status: e.target.value }));
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="new">New</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="applied">Applied</option>
                            <option value="dismissed">Dismissed</option>
                        </select>
                    </div>
                </div>

                {/* Insights List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Insight
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Device
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Confidence
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {insights.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                            {loading ? 'Loading insights...' : 'No insights found. Click "Analyze Logs" to get started.'}
                                        </td>
                                    </tr>
                                ) : (
                                    insights.map((insight) => {
                                        let analysis = null;
                                        try {
                                            if (insight.analysis) {
                                                analysis = typeof insight.analysis === 'string' 
                                                    ? JSON.parse(insight.analysis) 
                                                    : insight.analysis;
                                            }
                                        } catch (e) {
                                            console.error('Failed to parse analysis:', e);
                                        }

                                        return (
                                            <tr key={insight.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{insight.title}</p>
                                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                            {insight.summary || 'No summary available'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {insight.Device ? (
                                                        <span className="text-sm text-gray-900 dark:text-white">
                                                            {insight.Device.hostname || 'Unknown'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`text-sm font-medium ${getConfidenceColor(parseFloat(insight.confidence_score) || 0)}`}>
                                                        {Math.round(parseFloat(insight.confidence_score) || 0)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(insight.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(insight.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleViewDetails(insight.id)}
                                                        className="text-blue-600 hover:text-blue-900 p-1"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-700">
                                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total insights)
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

                {/* Analyze Modal */}
                {showAnalyzeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Analyze Event Logs</h2>
                                <button
                                    onClick={() => setShowAnalyzeModal(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Device
                                    </label>
                                    <select
                                        value={analysisForm.device_id}
                                        onChange={(e) => setAnalysisForm(prev => ({ ...prev, device_id: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select a device...</option>
                                        {devices.map(device => (
                                            <option key={device.id} value={device.id}>
                                                {device.hostname || `Device ${device.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Time Range (hours)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="168"
                                        value={analysisForm.hours}
                                        onChange={(e) => setAnalysisForm(prev => ({ ...prev, hours: parseInt(e.target.value) || 24 }))}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Log Levels
                                    </label>
                                    <div className="space-y-2">
                                        {['critical', 'error', 'warning'].map(level => (
                                            <label key={level} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={analysisForm.log_levels.includes(level)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setAnalysisForm(prev => ({
                                                                ...prev,
                                                                log_levels: [...prev.log_levels, level]
                                                            }));
                                                        } else {
                                                            setAnalysisForm(prev => ({
                                                                ...prev,
                                                                log_levels: prev.log_levels.filter(l => l !== level)
                                                            }));
                                                        }
                                                    }}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm text-gray-700 capitalize">{level}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={analyzing || !analysisForm.device_id}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {analyzing ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Analyzing...
                                            </span>
                                        ) : (
                                            'Analyze'
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setShowAnalyzeModal(false)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Insight Details Modal */}
                {showDetails && selectedInsight && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Insight Details</h2>
                                <button
                                    onClick={() => {
                                        setShowDetails(false);
                                        setSelectedInsight(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{selectedInsight.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400">{selectedInsight.summary}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Device</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                                            {selectedInsight.Device?.hostname || 'N/A'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Confidence Score</dt>
                                        <dd className="mt-1">
                                            <span className={`text-sm font-medium ${getConfidenceColor(parseFloat(selectedInsight.confidence_score) || 0)}`}>
                                                {Math.round(parseFloat(selectedInsight.confidence_score) || 0)}%
                                            </span>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                                        <dd className="mt-1">{getStatusBadge(selectedInsight.status)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Created At</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                                            {new Date(selectedInsight.created_at).toLocaleString()}
                                        </dd>
                                    </div>
                                </div>

                                {(() => {
                                    let analysis = null;
                                    try {
                                        if (selectedInsight.analysis) {
                                            analysis = typeof selectedInsight.analysis === 'string'
                                                ? JSON.parse(selectedInsight.analysis)
                                                : selectedInsight.analysis;
                                        }
                                    } catch (e) {
                                        console.error('Failed to parse analysis:', e);
                                    }

                                    if (!analysis) return null;

                                    return (
                                        <>
                                            {analysis.root_cause && (
                                                <div>
                                                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Root Cause</h4>
                                                    <p className="text-gray-600 dark:text-gray-400 bg-gray-50 p-3 rounded p-3">{analysis.root_cause}</p>
                                                </div>
                                            )}

                                            {analysis.recommendations && analysis.recommendations.length > 0 && (
                                                <div>
                                                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                                                        Recommendations
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {analysis.recommendations.map((rec, index) => (
                                                            <li key={index} className="flex items-start gap-2 bg-blue-50 p-3 rounded">
                                                                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                                                <span className="text-gray-700">{rec}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {analysis.priority_actions && analysis.priority_actions.length > 0 && (
                                                <div>
                                                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                        <Zap className="w-5 h-5 text-orange-500" />
                                                        Priority Actions
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {analysis.priority_actions.map((action, index) => (
                                                            <li key={index} className="flex items-start gap-2 bg-orange-50 p-3 rounded">
                                                                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                                                <span className="text-gray-700">{action}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}

                                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => {
                                            setShowDetails(false);
                                            setSelectedInsight(null);
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
            </div>
        </FeatureGate>
    );
};

export default AIInsights;
