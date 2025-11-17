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

// State untuk simulasi yang lebih realistis
let timeOffset = 0;
let temperatureTrend = 28; // Base temperature
let humidityTrend = 70; // Base humidity
let soilMoistureTrend = 55; // Base soil moisture

// Sensor value generators (realistic ranges with natural variation)
function generateTemperature() {
  // Simulate natural temperature fluctuation dengan sine wave + random noise
  const timeOfDay = (Date.now() / 1000 + timeOffset) / 3600; // Hours
  const dailyCycle = Math.sin((timeOfDay * Math.PI) / 12) * 3; // ±3°C daily variation
  const randomNoise = (Math.random() - 0.5) * 2; // ±1°C random noise
  const trend = (Math.random() - 0.5) * 0.1; // Slow drift

  temperatureTrend += trend;
  temperatureTrend = Math.max(22, Math.min(35, temperatureTrend)); // Keep in realistic range

  const value = temperatureTrend + dailyCycle + randomNoise;
  return Math.max(20, Math.min(40, value)).toFixed(2);
}

function generateHumidity() {
  // Humidity has inverse relationship with temperature
  const randomWalk = (Math.random() - 0.5) * 3; // ±1.5% change
  const trend = (Math.random() - 0.5) * 0.2;

  humidityTrend += trend + randomWalk;
  humidityTrend = Math.max(50, Math.min(95, humidityTrend));

  const noise = (Math.random() - 0.5) * 4;
  const value = humidityTrend + noise;
  return Math.max(45, Math.min(100, value)).toFixed(2);
}

function generateSoilMoisture() {
  // Soil moisture gradually decreases, jumps up when "watered"
  const evaporation = -0.3; // Gradual decrease
  const randomVariation = (Math.random() - 0.5) * 2;

  soilMoistureTrend += evaporation + randomVariation;

  // Simulate watering when too dry
  if (soilMoistureTrend < 35) {
    soilMoistureTrend += Math.random() * 25 + 15; // Add water
    console.log("💧 Simulated watering event");
  }

  soilMoistureTrend = Math.max(30, Math.min(85, soilMoistureTrend));

  const noise = (Math.random() - 0.5) * 3;
  const value = soilMoistureTrend + noise;
  return Math.max(25, Math.min(90, value)).toFixed(2);
}

function generateLightIntensity() {
  const hour = new Date().getHours();
  const minute = new Date().getMinutes();
  const timeInHours = hour + minute / 60;

  // Simulate realistic sunlight curve
  if (timeInHours >= 6 && timeInHours <= 18) {
    // Parabolic curve for daylight (peaks at noon)
    const noonOffset = timeInHours - 12;
    const intensity = 900 - noonOffset * noonOffset * 15; // Peak at noon
    const clouds = Math.random() * 200 - 100; // Cloud variation
    const value = Math.max(200, intensity + clouds);
    return value.toFixed(2);
  }
  return (Math.random() * 50).toFixed(2); // Night time
}

function generateRainStatus() {
  return Math.random() > 0.85 ? 1 : 0; // 15% chance of rain
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
  timeOffset += SEND_INTERVAL / 1000; // Increment time for simulation
}, SEND_INTERVAL);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down simulator...");
  if (ws) {
    ws.close();
  }
  process.exit(0);
});
