#!/usr/bin/env node
/**
 * Node.js WebSocket Test Client
 * Test WebSocket server without ESP8266
 */

import WebSocket from "ws";

const WS_URL = "ws://localhost:3000/ws";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testWebClient() {
  log("🌐 Testing as Web Client...", colors.bright + colors.blue);

  return new Promise(async (resolve) => {
    const ws = new WebSocket(WS_URL);

    ws.on("open", () => {
      log("✓ Connected to WebSocket server", colors.green);

      // Authenticate
      const authMsg = {
        type: "auth",
        data: {
          clientType: "web",
          deviceId: "NODE_TEST_WEB_" + Date.now(),
        },
      };
      ws.send(JSON.stringify(authMsg));
      log("→ Sent: auth (web client)", colors.green);
    });

    ws.on("message", (data) => {
      const message = JSON.parse(data);
      log(`← Received: ${message.type}`, colors.blue);

      if (message.type === "connected") {
        log("   Server welcome message received", colors.blue);
      } else if (message.type === "auth_success") {
        log("✓ Authentication successful!", colors.green);

        // Send ping
        const pingMsg = { type: "ping" };
        ws.send(JSON.stringify(pingMsg));
        log("→ Sent: ping", colors.green);
      } else if (message.type === "pong") {
        log("✓ Received pong response", colors.green);

        // Close after successful test
        setTimeout(() => {
          ws.close();
        }, 1000);
      }
    });

    ws.on("error", (error) => {
      log(`✗ Error: ${error.message}`, colors.red);
      resolve(false);
    });

    ws.on("close", () => {
      log("✓ Web Client test completed", colors.green);
      resolve(true);
    });
  });
}

async function testESP8266Client() {
  log("\n🤖 Testing as ESP8266 Device...", colors.bright + colors.blue);

  return new Promise(async (resolve) => {
    const ws = new WebSocket(WS_URL);
    let authSuccess = false;

    ws.on("open", () => {
      log("✓ Connected to WebSocket server", colors.green);

      // Authenticate as ESP8266
      const authMsg = {
        type: "auth",
        data: {
          clientType: "esp8266",
          deviceId: "NODE_TEST_ESP8266_" + Date.now(),
        },
      };
      ws.send(JSON.stringify(authMsg));
      log("→ Sent: auth (ESP8266)", colors.green);
    });

    ws.on("message", (data) => {
      const message = JSON.parse(data);
      log(`← Received: ${message.type}`, colors.blue);

      if (message.type === "connected") {
        log("   Server welcome message received", colors.blue);
      } else if (message.type === "auth_success") {
        log("✓ Authentication successful!", colors.green);
        authSuccess = true;

        // Send sensor reading
        const sensorMsg = {
          type: "sensor_reading",
          data: {
            sensorId: "test-sensor-123",
            sensorType: "temperature",
            value: 28.5,
            unit: "°C",
            recordedAt: new Date().toISOString(),
          },
        };
        ws.send(JSON.stringify(sensorMsg));
        log("→ Sent: sensor_reading (28.5°C)", colors.green);
      } else if (message.type === "sensor_reading_ack") {
        log("✓ Sensor reading acknowledged", colors.green);

        // Send actuator status
        const actuatorMsg = {
          type: "actuator_status",
          data: {
            actuatorId: "test-actuator-456",
            actuatorType: "servo",
            state: "OPEN",
          },
        };
        ws.send(JSON.stringify(actuatorMsg));
        log("→ Sent: actuator_status (OPEN)", colors.green);
      } else if (message.type === "actuator_status_ack") {
        log("✓ Actuator status acknowledged", colors.green);

        // Close after successful test
        setTimeout(() => {
          ws.close();
        }, 1000);
      } else if (message.type === "command_dispatch") {
        log("📨 Received command from server!", colors.yellow);
        log(`   Command: ${message.data.command}`, colors.yellow);

        // Send acknowledgment
        const ackMsg = {
          type: "command_ack",
          data: {
            commandId: message.data.commandId,
            actuatorId: message.data.actuatorId,
            status: "ack",
            message: "Command executed successfully",
          },
        };
        ws.send(JSON.stringify(ackMsg));
        log("→ Sent: command_ack", colors.green);
      }
    });

    ws.on("error", (error) => {
      log(`✗ Error: ${error.message}`, colors.red);
      resolve(false);
    });

    ws.on("close", () => {
      log("✓ ESP8266 test completed", colors.green);
      resolve(authSuccess);
    });
  });
}

async function testConnectionOnly() {
  log("\n🔌 Testing basic connection...", colors.bright + colors.blue);

  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);

    ws.on("open", () => {
      log("✓ Connection successful!", colors.green);
      ws.close();
    });

    ws.on("message", (data) => {
      const message = JSON.parse(data);
      log(`← Server says: ${message.type}`, colors.blue);
    });

    ws.on("error", (error) => {
      log(`✗ Connection failed: ${error.message}`, colors.red);
      resolve(false);
    });

    ws.on("close", () => {
      resolve(true);
    });
  });
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(
    `${colors.bright}🌱 Greenhouse WebSocket Test Suite${colors.reset}`
  );
  console.log("=".repeat(60) + "\n");

  // Test 1: Basic Connection
  const result1 = await testConnectionOnly();
  await delay(1000);

  if (!result1) {
    log(
      "\n✗ Basic connection failed. Make sure server is running!",
      colors.red
    );
    log("   Run: npm run dev", colors.yellow);
    process.exit(1);
  }

  // Test 2: Web Client
  const result2 = await testWebClient();
  await delay(1000);

  // Test 3: ESP8266 Client
  const result3 = await testESP8266Client();
  await delay(1000);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`${colors.bright}📊 Test Summary${colors.reset}`);
  console.log("=".repeat(60));
  console.log(
    `Basic Connection: ${result1 ? colors.green + "✓" : colors.red + "✗"}${
      colors.reset
    }`
  );
  console.log(
    `Web Client Test: ${result2 ? colors.green + "✓" : colors.red + "✗"}${
      colors.reset
    }`
  );
  console.log(
    `ESP8266 Test: ${result3 ? colors.green + "✓" : colors.red + "✗"}${
      colors.reset
    }`
  );
  console.log("=".repeat(60) + "\n");

  if (result1 && result2 && result3) {
    log("🎉 All tests passed!", colors.bright + colors.green);
    process.exit(0);
  } else {
    log("⚠️  Some tests failed", colors.bright + colors.yellow);
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n✗ Unexpected error: ${error.message}`, colors.red);
  process.exit(1);
});
