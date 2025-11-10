/**
 * API Route: /api/actuators/[id]/status
 * Get status of specific actuator
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/actuators/[id]/status - Get actuator status
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const actuator = await prisma.actuator.findUnique({
      where: { id },
      include: {
        commands: {
          orderBy: {
            issuedAt: "desc",
          },
          take: 1, // Get latest command
        },
      },
    });

    if (!actuator) {
      return NextResponse.json(
        {
          success: false,
          error: "Actuator not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: actuator.id,
        name: actuator.name,
        type: actuator.type,
        state: actuator.state,
        updatedAt: actuator.updatedAt,
        latestCommand: actuator.commands[0] || null,
      },
    });
  } catch (error) {
    console.error("Error fetching actuator status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch actuator status",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH /api/actuators/[id]/status - Update actuator status (for ESP8266 to report back)
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { state, commandId } = body;

    // Validation
    if (!state) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: state",
        },
        { status: 400 }
      );
    }

    // Check if actuator exists
    const actuator = await prisma.actuator.findUnique({
      where: { id },
    });

    if (!actuator) {
      return NextResponse.json(
        {
          success: false,
          error: "Actuator not found",
        },
        { status: 404 }
      );
    }

    // Update actuator state
    const updatedActuator = await prisma.actuator.update({
      where: { id },
      data: { state },
    });

    // If commandId provided, update command status to 'ack' (acknowledged)
    if (commandId) {
      await prisma.actuatorCommand.update({
        where: { id: commandId },
        data: { status: "ack" },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedActuator,
      message: "Actuator status updated successfully",
    });
  } catch (error) {
    console.error("Error updating actuator status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update actuator status",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
