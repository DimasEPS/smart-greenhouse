/**
 * API Route: /api/actuators
 * Get list of all actuators with their current state
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/actuators - Get all actuators
export async function GET() {
  try {
    const actuators = await prisma.actuator.findMany({
      include: {
        commands: {
          orderBy: {
            issuedAt: "desc",
          },
          take: 5, // Include last 5 commands per actuator
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: actuators,
      count: actuators.length,
    });
  } catch (error) {
    console.error("Error fetching actuators:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch actuators",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
