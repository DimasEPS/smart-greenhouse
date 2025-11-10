"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import {
  DoorOpen,
  DoorClosed,
  Power,
  PowerOff,
  Info,
  Loader2,
} from "lucide-react";

export function ControlPanel({
  onRoofOpen,
  onRoofClose,
  onPumpOn,
  onPumpOff,
  isLoading = false,
}) {
  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Kontrol Manual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Kontrol Kaca/Atap</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={onRoofOpen}
              variant="default"
              size="sm"
              className="w-full bg-black hover:bg-gray-800 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <DoorOpen className="mr-1.5 h-4 w-4" />
              )}
              Buka Kaca
            </Button>
            <Button
              onClick={onRoofClose}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <DoorClosed className="mr-1.5 h-4 w-4" />
              )}
              Tutup Kaca
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Kontrol Pompa Air</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={onPumpOn}
              variant="default"
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Power className="mr-1.5 h-4 w-4" />
              )}
              Hidupkan Pompa
            </Button>
            <Button
              onClick={onPumpOff}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <PowerOff className="mr-1.5 h-4 w-4" />
              )}
              Matikan Pompa
            </Button>
          </div>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800">
            Catatan: Kontrol manual akan meng-override sistem otomatis untuk
            sementara.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
