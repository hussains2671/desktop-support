import React, { useEffect, useRef, useState } from 'react';
import { Monitor, Wifi, WifiOff, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { loadRFB } from '../../utils/rfb-loader';

/**
 * NoVNC Viewer Component
 * Displays remote desktop connection using noVNC
 */
const NoVNCViewer = ({ websocketUrl, onDisconnect, onError }) => {
    const canvasRef = useRef(null);
    const rfbRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [error, setError] = useState(null);
    const [rfbModule, setRfbModule] = useState(null);

    // Load RFB module on component mount (lazy loaded to prevent app crash)
    useEffect(() => {
        let isMounted = true;
        
        // Only load if websocketUrl is provided
        if (!websocketUrl) {
            return;
        }

        loadRFB().then(RFB => {
            if (isMounted && RFB) {
                setRfbModule(() => RFB);
            }
        }).catch(err => {
            console.error('Failed to load noVNC:', err);
            if (isMounted) {
                setError('Failed to load noVNC library. Please refresh the page.');
                toast.error('Failed to load noVNC library. Please refresh the page.');
                if (onError) onError(err);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [websocketUrl, onError]);

    useEffect(() => {
        if (!websocketUrl || !rfbModule) return;

        connect();

        return () => {
            disconnect();
        };
    }, [websocketUrl, rfbModule]);

    const connect = () => {
        if (!canvasRef.current || !websocketUrl || !rfbModule) return;

        try {
            setConnecting(true);
            setError(null);

            // Create RFB connection
            const rfb = new rfbModule(canvasRef.current, websocketUrl, {
                credentials: {
                    password: '' // Password handled via token in URL
                }
            });

            rfb.addEventListener('connect', handleConnect);
            rfb.addEventListener('disconnect', handleDisconnect);
            rfb.addEventListener('credentialsrequired', handleCredentialsRequired);
            rfb.addEventListener('securityfailure', handleSecurityFailure);

            rfbRef.current = rfb;
        } catch (err) {
            setError(err.message);
            setConnecting(false);
            if (onError) onError(err);
            toast.error('Failed to connect: ' + err.message);
        }
    };

    const handleConnect = () => {
        setConnected(true);
        setConnecting(false);
        setError(null);
        toast.success('Connected to remote desktop');
    };

    const handleDisconnect = (e) => {
        setConnected(false);
        setConnecting(false);
        
        if (e.detail.clean) {
            toast.success('Disconnected from remote desktop');
        } else {
            setError('Connection lost');
            toast.error('Connection lost');
        }
        
        if (onDisconnect) onDisconnect(e);
    };

    const handleCredentialsRequired = () => {
        // Credentials should be in URL token, but if required, handle here
        setError('Credentials required');
    };

    const handleSecurityFailure = (e) => {
        setError('Security failure: ' + e.detail.reason);
        toast.error('Security failure');
        if (onError) onError(new Error(e.detail.reason));
    };

    const disconnect = () => {
        if (rfbRef.current) {
            try {
                rfbRef.current.disconnect();
            } catch (err) {
                console.error('Error disconnecting:', err);
            }
            rfbRef.current = null;
        }
        setConnected(false);
        setConnecting(false);
    };

    const toggleFullscreen = () => {
        const container = canvasRef.current?.parentElement;
        if (!container) return;

        if (!fullscreen) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
        setFullscreen(!fullscreen);
    };

    const sendCtrlAltDel = () => {
        if (rfbRef.current && connected) {
            rfbRef.current.sendCtrlAltDel();
            toast.success('Sent Ctrl+Alt+Del');
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        };
    }, []);

    if (!websocketUrl) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                    <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">No connection URL provided</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
            {/* Connection Status Bar */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-75 text-white p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {connecting && (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span className="text-sm">Connecting...</span>
                        </>
                    )}
                    {connected && (
                        <>
                            <Wifi className="w-4 h-4 text-green-400" />
                            <span className="text-sm">Connected</span>
                        </>
                    )}
                    {!connected && !connecting && (
                        <>
                            <WifiOff className="w-4 h-4 text-red-400" />
                            <span className="text-sm">Disconnected</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {connected && (
                        <>
                            <button
                                onClick={sendCtrlAltDel}
                                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                                title="Send Ctrl+Alt+Del"
                            >
                                Ctrl+Alt+Del
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className="p-1 hover:bg-gray-700 rounded"
                                title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            >
                                {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                        </>
                    )}
                    <button
                        onClick={disconnect}
                        className="p-1 hover:bg-red-600 rounded"
                        title="Disconnect"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="absolute top-12 left-0 right-0 z-10 bg-red-600 text-white p-2 text-sm">
                    {error}
                </div>
            )}

            {/* VNC Canvas */}
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ cursor: connected ? 'default' : 'not-allowed' }}
            />

            {/* Loading Overlay */}
            {connecting && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center text-white">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p>Connecting to remote desktop...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NoVNCViewer;

