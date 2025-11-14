/**
 * IoT Device Simulator
 * Simulates ESP8266 sending sensor data via WebSocket
 *
 * Usage: node scripts/iot-simulator.js
 */

import WebSocket from "ws";

const WS_URL = "ws://localhost:3000/ws";
const DEVICE_ID = "esp8266_simulator_001";
const SEND_INTERVAL = 5000; // Send data every 5 seconds

let ws;
let isConnected = false;

// Sensor value generators (realistic ranges)
function generateTemperature() {
  return (25 + Math.random() * 10).toFixed(2); // 25-35°C
}

function generateHumidity() {
  return (60 + Math.random() * 30).toFixed(2); // 60-90%
}

function generateSoilMoisture() {
  return (30 + Math.random() * 50).toFixed(2); // 30-80%
}

function generateLightIntensity() {
  const hour = new Date().getHours();
  // Simulate day/night cycle
  if (hour >= 6 && hour <= 18) {
    return (400 + Math.random() * 600).toFixed(2); // 400-1000 lux (day)
  }
  return (0 + Math.random() * 100).toFixed(2); // 0-100 lux (night)
}

function generateRainStatus() {
  return Math.random() > 0.8 ? 1 : 0; // 20% chance of rain
}

// Connect to WebSocket server
function connect() {
  console.log(`🔌 Connecting to ${WS_URL}...`);

  ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log("✅ Connected to WebSocket server");
    isConnected = true;

    // Authenticate as ESP8266
    const authMessage = {
      type: "auth",
      data: {
        clientType: "esp8266",
        deviceId: DEVICE_ID,
      },
    };

    ws.send(JSON.stringify(authMessage));
    console.log("🔐 Sent authentication message");
  });

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log("📨 Received:", message.type, message);

      // Handle actuator commands from server
      if (message.type === "actuator_command") {
        handleActuatorCommand(message.data);
      }
    } catch (error) {
      console.error("❌ Error parsing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("❌ Disconnected from WebSocket server");
    isConnected = false;

    // Reconnect after 3 seconds
    setTimeout(() => {
      console.log("🔄 Reconnecting...");
      connect();
    }, 3000);
  });

  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error.message);
  });
}

// Send sensor readings
function sendSensorData() {
  if (!isConnected) {
    console.log("⏸️  Not connected, skipping data send");
    return;
  }

  const sensorData = {
    type: "sensor_reading",
    data: {
      deviceId: DEVICE_ID,
      readings: [
        {
          sensorType: "temperature",
          value: parseFloat(generateTemperature()),
          unit: "°C",
        },
        {
          sensorType: "humidity",
          value: parseFloat(generateHumidity()),
          unit: "%",
        },
        {
          sensorType: "soil",
          value: parseFloat(generateSoilMoisture()),
          unit: "%",
        },
        {
          sensorType: "light",
          value: parseFloat(generateLightIntensity()),
          unit: "lux",
        },
        {
          sensorType: "rain",
          value: generateRainStatus(),
          unit: "boolean",
        },
      ],
      timestamp: new Date().toISOString(),
    },
  };

  ws.send(JSON.stringify(sensorData));
  console.log("📤 Sent sensor data:", {
    temp: sensorData.data.readings[0].value,
    humidity: sensorData.data.readings[1].value,
    soil: sensorData.data.readings[2].value,
    light: sensorData.data.readings[3].value,
    rain: sensorData.data.readings[4].value === 1 ? "YES" : "NO",
  });
}

// Handle actuator commands from server
function handleActuatorCommand(data) {
  console.log("🎮 Received actuator command:", data);

  // Simulate actuator execution
  setTimeout(() => {
    const ack = {
      type: "command_ack",
      data: {
        commandId: data.commandId,
        actuatorId: data.actuatorId,
        status: "completed",
        message: "Command executed successfully",
        timestamp: new Date().toISOString(),
      },
    };

    ws.send(JSON.stringify(ack));
    console.log("✅ Sent command acknowledgment");

    // Send updated actuator status
    sendActuatorStatus(data.actuatorId, data.command);
  }, 1000);
}

// Send actuator status update
function sendActuatorStatus(actuatorId, command) {
  const statusMessage = {
    type: "actuator_status",
    data: {
      actuatorId,
      state: command === "OPEN" || command === "ON" ? "active" : "inactive",
      timestamp: new Date().toISOString(),
    },
  };

  ws.send(JSON.stringify(statusMessage));
  console.log("📡 Sent actuator status update");
}

// Start simulator
console.log("🤖 IoT Device Simulator Started");
console.log("================================");
console.log(`Device ID: ${DEVICE_ID}`);
console.log(`WebSocket URL: ${WS_URL}`);
console.log(`Send Interval: ${SEND_INTERVAL}ms`);
console.log("================================\n");

connect();

// Send sensor data periodically
setInterval(() => {
  sendSensorData();
}, SEND_INTERVAL);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down simulator...");
  if (ws) {
    ws.close();
  }
  process.exit(0);
});
