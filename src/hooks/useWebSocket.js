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

        if (onOpen) onOpen(event);
      };

      ws.onclose = (event) => {
        console.log("[WS] Disconnected");
        setIsConnected(false);
        wsRef.current = null;

        if (onClose) onClose(event);

        // Attempt reconnection
        if (
          shouldReconnectRef.current &&
          reconnect &&
          reconnectCount < reconnectAttempts
        ) {
          console.log(
            `[WS] Reconnecting in ${reconnectInterval}ms... (attempt ${
              reconnectCount + 1
            }/${reconnectAttempts})`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount((prev) => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error("[WS] Error:", error);
        if (onError) onError(error);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          if (onMessage) onMessage(message);
        } catch (error) {
          console.error("[WS] Error parsing message:", error);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WS] Connection error:", error);
      if (onError) onError(error);
    }
  }, [
    url,
    onOpen,
    onClose,
    onError,
    onMessage,
    reconnect,
    reconnectInterval,
    reconnectAttempts,
    reconnectCount,
  ]);

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
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}
