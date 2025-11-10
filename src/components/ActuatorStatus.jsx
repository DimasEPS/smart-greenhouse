"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { DoorOpen, Droplets } from "lucide-react";

export function ActuatorStatus({ roofStatus, pumpStatus }) {
  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Status Aktuator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <DoorOpen className="text-blue-500" size={20} strokeWidth={2} />
            <span className="text-sm font-medium">Status Kaca/Atap</span>
          </div>
          <Badge
            variant={roofStatus === "OPEN" ? "default" : "secondary"}
            className="text-xs"
          >
            {roofStatus}
          </Badge>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Droplets className="text-blue-500" size={20} strokeWidth={2} />
            <span className="text-sm font-medium">Status Pompa Air</span>
          </div>
          <Badge
            variant={pumpStatus === "ON" ? "default" : "secondary"}
            className="text-xs"
          >
            {pumpStatus}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
