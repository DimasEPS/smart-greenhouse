/**
 * API Route: /api/readings/latest
 * Get latest sensor readings (one per sensor type)
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/readings/latest - Get latest reading for each sensor
export async function GET() {
  try {
    // Get all sensors
    const sensors = await prisma.sensor.findMany();

    // Get latest reading for each sensor
    const latestReadings = await Promise.all(
      sensors.map(async (sensor) => {
        const reading = await prisma.sensorReading.findFirst({
          where: {
            sensorId: sensor.id,
          },
          orderBy: {
            recordedAt: "desc",
          },
        });

        return {
          sensor: {
            id: sensor.id,
            name: sensor.name,
            type: sensor.type,
            unit: sensor.unit,
          },
          reading: reading
            ? {
                id: reading.id,
                value: reading.value,
                recordedAt: reading.recordedAt,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: latestReadings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching latest readings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch latest readings",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
