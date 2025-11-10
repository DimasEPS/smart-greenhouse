/**
 * API Route: /api/sensors
 * Get list of all registered sensors
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/sensors - Get all sensors
export async function GET() {
  try {
    const sensors = await prisma.sensor.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: sensors,
      count: sensors.length,
    });
  } catch (error) {
    console.error("Error fetching sensors:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sensors",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
