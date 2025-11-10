/**
 * API Route: /api/readings
 * Get historical sensor readings with filters
 *
 * Query params:
 * - range: 1h, 6h, 12h, 24h, 7d, 30d (default: 24h)
 * - sensorId: filter by specific sensor ID
 * - sensorType: filter by sensor type (temperature, humidity, soil, light, rain)
 * - limit: max number of results (default: 100)
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastSensorReading } from "@/lib/websocket";

// Helper function to parse time range
function parseTimeRange(range) {
  const now = new Date();
  const rangeMap = {
    "1h": 1,
    "6h": 6,
    "12h": 12,
    "24h": 24,
    "7d": 24 * 7,
    "30d": 24 * 30,
  };

  const hours = rangeMap[range] || 24; // default 24h
  const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return startTime;
}

// GET /api/readings - Get historical sensor readings
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "24h";
    const sensorId = searchParams.get("sensorId");
    const sensorType = searchParams.get("sensorType");
    const limit = parseInt(searchParams.get("limit")) || 100;

    // Build where clause
    const where = {
      recordedAt: {
        gte: parseTimeRange(range),
      },
    };

    // Filter by sensor ID if provided
    if (sensorId) {
      where.sensorId = sensorId;
    }

    // Filter by sensor type if provided
    if (sensorType) {
      where.sensor = {
        type: sensorType,
      };
    }

    // Fetch readings with sensor info
    const readings = await prisma.sensorReading.findMany({
      where,
      include: {
        sensor: {
          select: {
            id: true,
            name: true,
            type: true,
            unit: true,
          },
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: readings,
      count: readings.length,
      filters: {
        range,
        sensorId,
        sensorType,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching readings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch readings",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/readings - Create new sensor reading (for ESP8266)
export async function POST(request) {
  try {
    const body = await request.json();
    const { sensorId, value, recordedAt } = body;

    // Validation
    if (!sensorId || value === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: sensorId, value",
        },
        { status: 400 }
      );
    }

    // Check if sensor exists
    const sensor = await prisma.sensor.findUnique({
      where: { id: sensorId },
    });

    if (!sensor) {
      return NextResponse.json(
        {
          success: false,
          error: "Sensor not found",
        },
        { status: 404 }
      );
    }

    // Create reading
    const reading = await prisma.sensorReading.create({
      data: {
        sensorId,
        value: parseFloat(value),
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      },
      include: {
        sensor: {
          select: {
            name: true,
            type: true,
            unit: true,
          },
        },
      },
    });

    // Broadcast to WebSocket clients
    broadcastSensorReading(reading);

    return NextResponse.json(
      {
        success: true,
        data: reading,
        message: "Sensor reading created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating reading:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create reading",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
