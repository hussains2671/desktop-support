import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
    createSession,
    getActiveSessions,
    endSession,
    getSessionHistory,
    refreshSession
} from '../services/remoteDesktopService';
import {
    initiateUpload,
    initiateDownload,
    uploadFile,
    downloadFile,
    getTransferStatus,
    cancelTransfer,
    getTransferHistory
} from '../services/fileTransferService';
// Lazy load NoVNCViewer to prevent app crash if it fails to load
import { lazy, Suspense } from 'react';
const NoVNCViewer = lazy(() => import('../components/Common/NoVNCViewer'));
import FileBrowser from '../components/Common/FileBrowser';
import FileTransferProgress from '../components/Common/FileTransferProgress';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';
import {
    Monitor,
    MonitorOff,
    Upload,
    Download,
    History,
    RefreshCw,
    X,
    Play,
    Square,
    FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const RemoteDesktop = () => {
    const [agents, setAgents] = useState([]);
    const [activeSessions, setActiveSessions] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sessionLoading, setSessionLoading] = useState(false);
    const [showFileBrowser, setShowFileBrowser] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);

    useEffect(() => {
        loadAgents();
        loadActiveSessions();
        loadTransfers();
        
        // Poll for updates
        const interval = setInterval(() => {
            loadActiveSessions();
            loadTransfers();
        }, 5000);
        
        return () => clearInterval(interval);
    }, []);

    const loadAgents = async () => {
        try {
            const response = await api.get('/agent', { params: { limit: 1000 } });
            setAgents(response.data.data || []);
        } catch (error) {
            console.error('Failed to load agents:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadActiveSessions = async () => {
        try {
            const result = await getActiveSessions();
            if (result.success) {
                setActiveSessions(result.data || []);
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    };

    const loadTransfers = async () => {
        try {
            const result = await getTransferHistory({ limit: 10 });
            if (result.success) {
                setTransfers(result.data.transfers || []);
            }
        } catch (error) {
            console.error('Failed to load transfers:', error);
        }
    };

    const handleCreateSession = async (agentId) => {
        try {
            setSessionLoading(true);
            const result = await createSession(agentId);
            if (result.success) {
                setCurrentSession(result.data);
                setSelectedAgent(agentId);
                toast.success('Remote session created successfully');
                loadActiveSessions();
            } else {
                toast.error(result.message || 'Failed to create session');
            }
        } catch (error) {
            console.error('Failed to create session:', error);
            toast.error('Failed to create session');
        } finally {
            setSessionLoading(false);
        }
    };

    const handleEndSession = async (sessionId) => {
        try {
            const result = await endSession(sessionId);
            if (result.success) {
                if (currentSession?.id === sessionId) {
                    setCurrentSession(null);
                    setSelectedAgent(null);
                }
                toast.success('Session ended successfully');
                loadActiveSessions();
            } else {
                toast.error(result.message || 'Failed to end session');
            }
        } catch (error) {
            console.error('Failed to end session:', error);
            toast.error('Failed to end session');
        }
    };

    const handleRefreshSession = async (sessionId) => {
        try {
            const result = await refreshSession(sessionId);
            if (result.success) {
                setCurrentSession(prev => ({
                    ...prev,
                    websocket_url: result.data.websocket_url
                }));
                toast.success('Session refreshed');
            } else {
                toast.error(result.message || 'Failed to refresh session');
            }
        } catch (error) {
            console.error('Failed to refresh session:', error);
            toast.error('Failed to refresh session');
        }
    };

    const handleFileUpload = async (file, destinationPath) => {
        if (!selectedAgent) {
            toast.error('Please select an agent first');
            return;
        }

        try {
            const result = await initiateUpload({
                agent_id: selectedAgent,
                file_name: file.name,
                file_size: file.size,
                destination_path: destinationPath
            });

            if (result.success) {
                // Upload file
                await uploadFile(result.data.upload_url, file, (progress) => {
                    // Update transfer progress
                    console.log('Upload progress:', progress);
                });
                toast.success('File uploaded successfully');
                loadTransfers();
            } else {
                toast.error(result.message || 'Failed to upload file');
            }
        } catch (error) {
            console.error('Failed to upload file:', error);
            toast.error('Failed to upload file');
        }
    };

    const handleFileDownload = async (file) => {
        if (!selectedAgent) {
            toast.error('Please select an agent first');
            return;
        }

        try {
            const result = await initiateDownload(selectedAgent, file.path);
            if (result.success) {
                await downloadFile(result.data.download_url, result.data.file_name);
                toast.success('File downloaded successfully');
                loadTransfers();
            } else {
                toast.error(result.message || 'Failed to download file');
            }
        } catch (error) {
            console.error('Failed to download file:', error);
            toast.error('Failed to download file');
        }
    };

    const handleCancelTransfer = async (transferId) => {
        try {
            const result = await cancelTransfer(transferId);
            if (result.success) {
                toast.success('Transfer cancelled');
                loadTransfers();
            } else {
                toast.error(result.message || 'Failed to cancel transfer');
            }
        } catch (error) {
            console.error('Failed to cancel transfer:', error);
            toast.error('Failed to cancel transfer');
        }
    };

    const onlineAgents = agents.filter(agent => agent.status === 'online');

    if (loading) {
        return <LoadingSpinner size="lg" text="Loading remote desktop..." />;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Monitor className="w-8 h-8" />
                        Remote Desktop & Control
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Connect to and control remote devices
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar - Agents & Sessions */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Agent Selection */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <h2 className="text-lg font-semibold mb-4">Available Agents</h2>
                        {onlineAgents.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                No online agents available
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {onlineAgents.map(agent => {
                                    const hasActiveSession = activeSessions.some(s => s.agent_id === agent.id);
                                    return (
                                        <div
                                            key={agent.id}
                                            className={`p-3 rounded-lg border ${
                                                selectedAgent === agent.id
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{agent.hostname || `Agent ${agent.id}`}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {agent.status}
                                                    </div>
                                                </div>
                                                {hasActiveSession ? (
                                                    <button
                                                        onClick={() => {
                                                            const session = activeSessions.find(s => s.agent_id === agent.id);
                                                            setCurrentSession(session);
                                                            setSelectedAgent(agent.id);
                                                        }}
                                                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
                                                    >
                                                        Connect
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleCreateSession(agent.id)}
                                                        disabled={sessionLoading}
                                                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                                                    >
                                                        {sessionLoading ? 'Creating...' : 'Start'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Active Sessions */}
                    {activeSessions.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <h2 className="text-lg font-semibold mb-4">Active Sessions</h2>
                            <div className="space-y-2">
                                {activeSessions.map(session => (
                                    <div
                                        key={session.id}
                                        className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-sm">
                                                    Session #{session.id}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    Started {new Date(session.started_at).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRefreshSession(session.id)}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                    title="Refresh"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEndSession(session.id)}
                                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                                                    title="End Session"
                                                >
                                                    <Square className="w-4 h-4 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* File Transfers */}
                    {transfers.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <h2 className="text-lg font-semibold mb-4">File Transfers</h2>
                            <div className="space-y-2">
                                {transfers.slice(0, 3).map(transfer => (
                                    <FileTransferProgress
                                        key={transfer.id}
                                        transfer={transfer}
                                        onCancel={handleCancelTransfer}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content - Remote Desktop Viewer */}
                <div className="lg:col-span-2 space-y-4">
                    {currentSession ? (
                        <>
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold">Remote Desktop</h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowFileBrowser(!showFileBrowser)}
                                            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center gap-1"
                                        >
                                            <FileText className="w-4 h-4" />
                                            {showFileBrowser ? 'Hide' : 'Show'} Files
                                        </button>
                                        <button
                                            onClick={() => handleEndSession(currentSession.id)}
                                            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1"
                                        >
                                            <Square className="w-4 h-4" />
                                            End Session
                                        </button>
                                    </div>
                                </div>
                                <div className="h-[600px]">
                                    <Suspense fallback={
                                        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
                                            <LoadingSpinner size="lg" />
                                        </div>
                                    }>
                                        <NoVNCViewer
                                            websocketUrl={currentSession.websocket_url}
                                            onDisconnect={() => {
                                                setCurrentSession(null);
                                                loadActiveSessions();
                                            }}
                                            onError={(error) => {
                                                toast.error('Connection error: ' + error.message);
                                            }}
                                        />
                                    </Suspense>
                                </div>
                            </div>

                            {/* File Browser */}
                            {showFileBrowser && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <h2 className="text-lg font-semibold mb-4">File Browser</h2>
                                    <div className="h-[400px]">
                                        <FileBrowser
                                            agentId={selectedAgent}
                                            onFileSelect={(file) => console.log('Selected:', file)}
                                            onUpload={handleFileUpload}
                                            onDownload={handleFileDownload}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12">
                            <div className="text-center">
                                <MonitorOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-2">No Active Session</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-4">
                                    Select an agent and start a remote desktop session to begin
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RemoteDesktop;

