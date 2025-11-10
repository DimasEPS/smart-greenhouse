/**
 * useWebSocket Hook
 * React hook for WebSocket connection management
 */

import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket(url, options = {}) {
  const {
    onOpen,
    onClose,
    onError,
    onMessage,
    reconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 10,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  // Use refs for callbacks to avoid recreating connect function
  const callbacksRef = useRef({ onOpen, onClose, onError, onMessage });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onOpen, onClose, onError, onMessage };
  }, [onOpen, onClose, onError, onMessage]);

  // Send message to WebSocket server
  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn("[WS] Cannot send message: WebSocket is not connected");
    return false;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      console.log("[WS] Connecting to:", url);
      const ws = new WebSocket(url);

      ws.onopen = (event) => {
        console.log("[WS] Connected");
        setIsConnected(true);
        setReconnectCount(0);

        // Authenticate as web client
        ws.send(
          JSON.stringify({
            type: "auth",
            data: {
              clientType: "web",
              deviceId: `web_${Date.now()}`,
            },
          })
        );

        if (callbacksRef.current.onOpen) callbacksRef.current.onOpen(event);
      };

      ws.onclose = (event) => {
        console.log("[WS] Disconnected");
        setIsConnected(false);
        wsRef.current = null;

        if (callbacksRef.current.onClose) callbacksRef.current.onClose(event);

        // Attempt reconnection
        if (shouldReconnectRef.current && reconnect) {
          setReconnectCount((prevCount) => {
            if (prevCount < reconnectAttempts) {
              console.log(
                `[WS] Reconnecting in ${reconnectInterval}ms... (attempt ${
                  prevCount + 1
                }/${reconnectAttempts})`
              );
              reconnectTimeoutRef.current = setTimeout(() => {
                connect();
              }, reconnectInterval);
              return prevCount + 1;
            } else {
              console.log("[WS] Max reconnection attempts reached");
              return prevCount;
            }
          });
        }
      };

      ws.onerror = (error) => {
        console.error("[WS] Error:", error);
        if (callbacksRef.current.onError) callbacksRef.current.onError(error);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          if (callbacksRef.current.onMessage)
            callbacksRef.current.onMessage(message);
        } catch (error) {
          console.error("[WS] Error parsing message:", error);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WS] Connection error:", error);
      if (callbacksRef.current.onError) callbacksRef.current.onError(error);
    }
  }, [url, reconnect, reconnectInterval, reconnectAttempts]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]); // Only reconnect when URL changes

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}
