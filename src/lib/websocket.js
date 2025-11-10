/**
 * WebSocket Server Handler
 * Manages WebSocket connections for real-time communication
 * between ESP8266, backend, and frontend clients
 */

import { WebSocketServer } from "ws";
import { parse } from "url";

// Store active connections
const clients = new Map();
const ESP8266_TYPE = "esp8266";
const WEB_CLIENT_TYPE = "web";

/**
 * Initialize WebSocket Server
 */
export function initWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    path: "/ws",
  });

  // Handle upgrade requests
  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url);

    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Handle new connections
  wss.on("connection", (ws, request) => {
    const clientId = generateClientId();
    const clientIp = request.socket.remoteAddress;

    console.log(`[WS] New connection: ${clientId} from ${clientIp}`);

    // Initialize client data
    const clientData = {
      id: clientId,
      type: null, // will be set on authentication
      ws,
      ip: clientIp,
      connectedAt: new Date(),
    };

    clients.set(clientId, clientData);

    // Send welcome message
    sendToClient(ws, {
      type: "connected",
      clientId,
      timestamp: new Date().toISOString(),
      message: "Connected to Greenhouse Monitor WebSocket Server",
    });

    // Handle incoming messages
    ws.on("message", (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage);
        handleMessage(clientId, message, wss);
      } catch (error) {
        console.error(`[WS] Error parsing message from ${clientId}:`, error);
        sendError(ws, "Invalid JSON format");
      }
    });

    // Handle connection close
    ws.on("close", () => {
      console.log(`[WS] Connection closed: ${clientId}`);
      clients.delete(clientId);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error(`[WS] Error on ${clientId}:`, error);
      clients.delete(clientId);
    });
  });

  console.log("[WS] WebSocket server initialized on path: /ws");
  return wss;
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(clientId, message, wss) {
  const client = clients.get(clientId);
  if (!client) return;

  const { type, data } = message;

  console.log(`[WS] Message from ${clientId}: ${type}`);

  switch (type) {
    case "auth":
      handleAuth(clientId, data);
      break;

    case "sensor_reading":
      handleSensorReading(clientId, data, wss);
      break;

    case "actuator_status":
      handleActuatorStatus(clientId, data, wss);
      break;

    case "command_ack":
      handleCommandAck(clientId, data, wss);
      break;

    case "ping":
      sendToClient(client.ws, {
        type: "pong",
        timestamp: new Date().toISOString(),
      });
      break;

    default:
      console.warn(`[WS] Unknown message type: ${type}`);
      sendError(client.ws, `Unknown message type: ${type}`);
  }
}

/**
 * Handle client authentication
 */
function handleAuth(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  const { clientType, deviceId } = data;

  if (clientType === ESP8266_TYPE || clientType === WEB_CLIENT_TYPE) {
    client.type = clientType;
    client.deviceId = deviceId;

    sendToClient(client.ws, {
      type: "auth_success",
      clientId,
      clientType,
      timestamp: new Date().toISOString(),
    });

    console.log(`[WS] Client ${clientId} authenticated as ${clientType}`);
  } else {
    sendError(client.ws, "Invalid client type");
  }
}

/**
 * Handle sensor reading from ESP8266
 * Broadcast to all web clients
 */
function handleSensorReading(clientId, data, wss) {
  const client = clients.get(clientId);

  // Verify it's from ESP8266
  if (client.type !== ESP8266_TYPE) {
    sendError(client.ws, "Only ESP8266 can send sensor readings");
    return;
  }

  console.log(`[WS] Sensor reading:`, data);

  // Broadcast to all web clients
  broadcastToWebClients({
    type: "sensor_reading",
    data,
    timestamp: new Date().toISOString(),
  });

  // Send acknowledgment to ESP8266
  sendToClient(client.ws, {
    type: "sensor_reading_ack",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle actuator status update from ESP8266
 * Broadcast to all web clients
 */
function handleActuatorStatus(clientId, data, wss) {
  const client = clients.get(clientId);

  // Verify it's from ESP8266
  if (client.type !== ESP8266_TYPE) {
    sendError(client.ws, "Only ESP8266 can send actuator status");
    return;
  }

  console.log(`[WS] Actuator status:`, data);

  // Broadcast to all web clients
  broadcastToWebClients({
    type: "actuator_status",
    data,
    timestamp: new Date().toISOString(),
  });

  // Send acknowledgment to ESP8266
  sendToClient(client.ws, {
    type: "actuator_status_ack",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle command acknowledgment from ESP8266
 */
function handleCommandAck(clientId, data, wss) {
  const client = clients.get(clientId);

  if (client.type !== ESP8266_TYPE) {
    return;
  }

  console.log(`[WS] Command acknowledged:`, data);

  // Broadcast to web clients
  broadcastToWebClients({
    type: "command_ack",
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send command to ESP8266 (called from API)
 */
export function sendCommandToESP8266(command) {
  if (typeof clients === "undefined") {
    console.warn("[WS] WebSocket server not initialized");
    return false;
  }

  const esp8266Clients = Array.from(clients.values()).filter(
    (client) => client.type === ESP8266_TYPE
  );

  if (esp8266Clients.length === 0) {
    console.warn("[WS] No ESP8266 connected");
    return false;
  }

  esp8266Clients.forEach((client) => {
    sendToClient(client.ws, {
      type: "command_dispatch",
      data: command,
      timestamp: new Date().toISOString(),
    });
  });

  console.log(
    `[WS] Command sent to ${esp8266Clients.length} ESP8266 device(s)`
  );
  return true;
}

/**
 * Broadcast sensor reading to all web clients (called from API)
 */
export function broadcastSensorReading(reading) {
  if (typeof clients === "undefined") return;

  broadcastToWebClients({
    type: "sensor_reading",
    data: reading,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast actuator status to all web clients (called from API)
 */
export function broadcastActuatorStatus(actuator) {
  if (typeof clients === "undefined") return;

  broadcastToWebClients({
    type: "actuator_status",
    data: actuator,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast message to all web clients
 */
function broadcastToWebClients(message) {
  const webClients = Array.from(clients.values()).filter(
    (client) => client.type === WEB_CLIENT_TYPE && client.ws.readyState === 1
  );

  webClients.forEach((client) => {
    sendToClient(client.ws, message);
  });

  console.log(`[WS] Broadcasted to ${webClients.length} web client(s)`);
}

/**
 * Send message to specific client
 */
function sendToClient(ws, message) {
  if (ws.readyState === 1) {
    // OPEN
    ws.send(JSON.stringify(message));
  }
}

/**
 * Send error message to client
 */
function sendError(ws, error) {
  sendToClient(ws, {
    type: "error",
    error,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Generate unique client ID
 */
function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get connected clients info
 */
export function getConnectedClients() {
  if (typeof clients === "undefined") return [];

  return Array.from(clients.values()).map((client) => ({
    id: client.id,
    type: client.type,
    deviceId: client.deviceId,
    ip: client.ip,
    connectedAt: client.connectedAt,
  }));
}
