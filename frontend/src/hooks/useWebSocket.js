import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom React hook for WebSocket connection
 * Handles authentication, message handling, and reconnection
 * 
 * Usage:
 *   const ws = useWebSocket((message) => {
 *       if (message.type === 'ticket-updated') {
 *           // Handle ticket update
 *       }
 *   });
 */
export const useWebSocket = (onMessage) => {
    const ws = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = useRef(1000);

    const connect = useCallback(() => {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;

            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket connected');
                reconnectAttempts.current = 0;
                reconnectDelay.current = 1000;
                
                // Send authentication token
                const token = localStorage.getItem('token');
                if (token) {
                    ws.current.send(JSON.stringify({
                        type: 'auth',
                        token
                    }));
                }
            };

            ws.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (onMessage) {
                        onMessage(message);
                    }
                } catch (error) {
                    console.error('WebSocket message parsing error:', error);
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.current.onclose = () => {
                console.log('WebSocket disconnected');
                // Attempt to reconnect
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    setTimeout(() => {
                        console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
                        connect();
                    }, reconnectDelay.current);
                    reconnectDelay.current = Math.min(reconnectDelay.current * 2, 10000); // Max 10s delay
                } else {
                    console.error('Max reconnection attempts reached');
                }
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
        }
    }, [onMessage]);

    useEffect(() => {
        connect();

        return () => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.close();
            }
        };
    }, [connect]);

    // Public methods to send messages
    const send = useCallback((message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected');
        }
    }, []);

    return {
        ws: ws.current,
        send,
        isConnected: ws.current?.readyState === WebSocket.OPEN
    };
};

export default useWebSocket;
