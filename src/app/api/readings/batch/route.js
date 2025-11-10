/**
 * API Route: /api/readings/batch
 * Save multiple sensor readings at once (from WebSocket/IoT device)
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/readings/batch - Save batch sensor readings
export async function POST(request) {
  try {
    const body = await request.json();
    const { deviceId, readings } = body;

    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid readings array",
        },
        { status: 400 }
      );
    }

    // Get all sensors from database
    const sensors = await prisma.sensor.findMany();
    const sensorMap = new Map(sensors.map((s) => [s.type, s]));

    // Prepare batch insert data
    const recordsToInsert = [];

    for (const reading of readings) {
      const { sensorType, value } = reading;
      const sensor = sensorMap.get(sensorType);

      if (!sensor) {
        console.warn(`[API] Unknown sensor type: ${sensorType}`);
        continue;
      }

      recordsToInsert.push({
        sensorId: sensor.id,
        value: parseFloat(value),
        recordedAt: new Date(),
      });
    }

    // Bulk insert to database
    const result = await prisma.sensorReading.createMany({
      data: recordsToInsert,
      skipDuplicates: true,
    });

    console.log(
      `[API] Saved ${result.count} sensor readings from ${
        deviceId || "unknown device"
      }`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          count: result.count,
          deviceId,
        },
        message: `Saved ${result.count} readings`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving batch readings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save readings",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
