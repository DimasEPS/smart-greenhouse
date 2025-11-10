/**
 * API Route: /api/actuators/[id]/commands
 * Send command to specific actuator
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendCommandToESP8266 } from "@/lib/websocket";

// POST /api/actuators/[id]/commands - Send command to actuator
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { command, issuedBy = "user:web" } = body;

    // Validation
    if (!command) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: command",
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

    // Create command
    const actuatorCommand = await prisma.actuatorCommand.create({
      data: {
        actuatorId: id,
        command,
        issuedBy,
        status: "queued", // Initial status
      },
      include: {
        actuator: {
          select: {
            id: true,
            name: true,
            type: true,
            state: true,
          },
        },
      },
    });

    // Parse command to update actuator state
    // Command format examples: "OPEN", "CLOSE", "ON", "OFF", "ANGLE:90"
    let newState = actuator.state;

    if (command === "OPEN" || command === "ON") {
      newState = command === "OPEN" ? "OPEN" : "ON";
    } else if (command === "CLOSE" || command === "OFF") {
      newState = command === "CLOSE" ? "CLOSED" : "OFF";
    } else if (command.startsWith("ANGLE:")) {
      const angle = command.split(":")[1];
      newState = `${angle}°`;
    }

    // Update actuator state
    const updatedActuator = await prisma.actuator.update({
      where: { id },
      data: { state: newState },
    });

    // Update command status to 'sent'
    await prisma.actuatorCommand.update({
      where: { id: actuatorCommand.id },
      data: { status: "sent" },
    });

    // Send command to ESP8266 via WebSocket
    sendCommandToESP8266({
      commandId: actuatorCommand.id,
      actuatorId: id,
      actuatorType: actuator.type,
      command,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          command: actuatorCommand,
          actuator: updatedActuator,
        },
        message: `Command '${command}' sent to ${actuator.name}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error sending command:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send command",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// GET /api/actuators/[id]/commands - Get command history for actuator
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit")) || 20;

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

    // Get command history
    const commands = await prisma.actuatorCommand.findMany({
      where: { actuatorId: id },
      orderBy: { issuedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        actuator: {
          id: actuator.id,
          name: actuator.name,
          type: actuator.type,
          state: actuator.state,
        },
        commands,
      },
      count: commands.length,
    });
  } catch (error) {
    console.error("Error fetching commands:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch commands",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
