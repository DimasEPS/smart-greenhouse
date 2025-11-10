/**
 * API Route: /api/ws/clients
 * Get connected WebSocket clients info
 */

import { NextResponse } from "next/server";
import { getConnectedClients } from "@/lib/websocket";

export async function GET() {
  try {
    const clients = getConnectedClients();

    return NextResponse.json({
      success: true,
      data: clients,
      count: clients.length,
      esp8266Connected: clients.some((c) => c.type === "esp8266"),
      webClientsCount: clients.filter((c) => c.type === "web").length,
    });
  } catch (error) {
    console.error("Error fetching WS clients:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch WebSocket clients",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
