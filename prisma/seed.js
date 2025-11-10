/**
 * Prisma Seed Script
 * Populate initial sensors and actuators data for the greenhouse system
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log("🗑️  Clearing existing data...");
  await prisma.actuatorCommand.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.actuator.deleteMany();
  await prisma.sensor.deleteMany();

  // Seed Sensors
  console.log("📊 Creating sensors...");

  const temperatureSensor = await prisma.sensor.create({
    data: {
      name: "DHT11 - Temperature",
      type: "temperature",
      unit: "°C",
    },
  });

  const humiditySensor = await prisma.sensor.create({
    data: {
      name: "DHT11 - Humidity",
      type: "humidity",
      unit: "%",
    },
  });

  const soilMoistureSensor = await prisma.sensor.create({
    data: {
      name: "Soil Moisture Sensor",
      type: "soil",
      unit: "%",
    },
  });

  const lightSensor = await prisma.sensor.create({
    data: {
      name: "LDR - Light Sensor",
      type: "light",
      unit: "lux",
    },
  });

  const rainSensor = await prisma.sensor.create({
    data: {
      name: "Rain Sensor",
      type: "rain",
      unit: "boolean",
    },
  });

  console.log(`✅ Created ${5} sensors`);

  // Seed Actuators
  console.log("🔧 Creating actuators...");

  const servoActuator = await prisma.actuator.create({
    data: {
      name: "Servo MG996R - Roof/Glass",
      type: "servo",
      state: "CLOSED", // Initial state: CLOSED (0°) or OPEN (90°)
    },
  });

  const pumpActuator = await prisma.actuator.create({
    data: {
      name: "Relay - Water Pump",
      type: "relay",
      state: "OFF", // Initial state: OFF or ON
    },
  });

  console.log(`✅ Created ${2} actuators`);

  // Seed some initial sensor readings for testing
  console.log("📈 Creating initial sensor readings...");

  const now = new Date();
  const readings = [];

  // Create readings for the last hour (every 5 minutes)
  for (let i = 0; i < 12; i++) {
    const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);

    readings.push(
      // Temperature readings
      prisma.sensorReading.create({
        data: {
          sensorId: temperatureSensor.id,
          value: 28 + Math.random() * 6, // 28-34°C
          recordedAt: timestamp,
        },
      }),
      // Humidity readings
      prisma.sensorReading.create({
        data: {
          sensorId: humiditySensor.id,
          value: 65 + Math.random() * 20, // 65-85%
          recordedAt: timestamp,
        },
      }),
      // Soil moisture readings
      prisma.sensorReading.create({
        data: {
          sensorId: soilMoistureSensor.id,
          value: 30 + Math.random() * 40, // 30-70%
          recordedAt: timestamp,
        },
      }),
      // Light readings
      prisma.sensorReading.create({
        data: {
          sensorId: lightSensor.id,
          value: 600 + Math.random() * 300, // 600-900 lux
          recordedAt: timestamp,
        },
      }),
      // Rain sensor readings
      prisma.sensorReading.create({
        data: {
          sensorId: rainSensor.id,
          value: Math.random() > 0.7 ? 1 : 0, // 0 = no rain, 1 = rain
          recordedAt: timestamp,
        },
      })
    );
  }

  await Promise.all(readings);
  console.log(`✅ Created ${readings.length} sensor readings`);

  console.log("✨ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
