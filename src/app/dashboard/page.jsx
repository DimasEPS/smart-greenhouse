"use client";
import { useState, useEffect, useMemo } from "react";
import { Thermometer, Droplet, Sprout, Sun, CloudRain } from "lucide-react";
import { SensorCard } from "../../components/SensorCard";
import { ActuatorStatus } from "../../components/ActuatorStatus";
import { ControlPanel } from "../../components/ControlPanel";
import { HistoricalChart } from "../../components/HistoricalChart";
import { toast } from "sonner";
import {
  useLatestReadings,
  useHistoricalReadings,
  useActuators,
  useSendActuatorCommand,
} from "@/hooks/useQueries";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useQueries";

export default function Dashboard() {
  const queryClient = useQueryClient();

  // React Query hooks
  const { data: latestReadings, isLoading: loadingReadings } =
    useLatestReadings({
      refetchInterval: 30000, // 30 seconds
    });

  const { data: actuators, isLoading: loadingActuators } = useActuators();

  const { data: historicalData, isLoading: loadingHistory } =
    useHistoricalReadings({
      range: "24h",
      limit: 100,
    });

  const sendCommand = useSendActuatorCommand();

  // WebSocket connection
  const { isConnected, lastMessage } = useWebSocket("ws://localhost:3000/ws");

  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const handleWebSocketMessage = (message) => {
      switch (message.type) {
        case "sensor_reading":
          console.log("[Dashboard] Received sensor reading via WebSocket");
          // Update last update timestamp
          setLastUpdate(new Date());
          // Invalidate queries to refetch latest data
          queryClient.invalidateQueries({
            queryKey: queryKeys.readings.latest,
          });
          queryClient.invalidateQueries({
            queryKey: ["readings", "historical"],
          });
          break;

        case "actuator_status":
          console.log("[Dashboard] Received actuator status via WebSocket");
          // Invalidate actuator queries
          queryClient.invalidateQueries({ queryKey: ["actuators"] });
          if (message.data?.actuatorId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.actuatorStatus(message.data.actuatorId),
            });
          }
          break;

        case "command_ack":
          console.log("[Dashboard] Received command acknowledgment");
          // Invalidate actuator queries to update state
          queryClient.invalidateQueries({ queryKey: ["actuators"] });
          break;
      }
    };

    handleWebSocketMessage(lastMessage);
  }, [lastMessage, queryClient]);

  // Transform latest readings into sensor data object
  const sensorData = useMemo(() => {
    if (!latestReadings || latestReadings.length === 0) {
      return {
        temperature: null,
        humidity: null,
        soil: null,
        light: null,
        rain: null,
      };
    }

    const data = {};
    latestReadings.forEach((reading) => {
      const sensorType = reading.sensor.type;
      // Round values to 1 decimal place for better display
      const roundedValue =
        typeof reading.value === "number"
          ? Math.round(reading.value * 10) / 10
          : reading.value;

      data[sensorType] = {
        value: roundedValue,
        unit: reading.sensor.unit,
        recordedAt: reading.recordedAt,
      };
    });

    return data;
  }, [latestReadings]);

  // Parse actuator status
  const roofActuator = actuators?.find((a) => a.type === "servo");
  const pumpActuator = actuators?.find((a) => a.type === "relay");

  // Format historical data for chart
  const chartData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return [];

    // Group readings by time (every 10 minutes)
    const groupedByTime = {};

    historicalData.forEach((reading) => {
      const time = new Date(reading.recordedAt);
      const minutes = Math.floor(time.getMinutes() / 10) * 10; // Round to nearest 10 min
      const timeKey = `${time.getHours().toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;

      if (!groupedByTime[timeKey]) {
        groupedByTime[timeKey] = {
          time: timeKey,
          suhu: null,
          kelembabanUdara: null,
          kelembabanTanah: null,
        };
      }

      // Take average or last value
      switch (reading.sensor.type) {
        case "temperature":
          groupedByTime[timeKey].suhu = Math.round(reading.value * 10) / 10;
          break;
        case "humidity":
          groupedByTime[timeKey].kelembabanUdara =
            Math.round(reading.value * 10) / 10;
          break;
        case "soil":
          groupedByTime[timeKey].kelembabanTanah =
            Math.round(reading.value * 10) / 10;
          break;
      }
    });

    // Sort by time and return last 24 hours
    return Object.values(groupedByTime)
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(-50); // Last 50 data points (~8 hours if every 10 min)
  }, [historicalData]);

  const getSoilMoistureStatus = (value) => {
    if (!value) return "-";
    if (value < 40) return "Kering";
    if (value < 70) return "Sedang";
    return "Basah";
  };

  const getLightStatus = (value) => {
    if (!value) return "-";
    if (value < 500) return "Redup";
    if (value < 800) return "Sedang";
    return "Terang";
  };

  const handleOpenRoof = () => {
    if (!roofActuator) {
      toast.error("Actuator roof tidak ditemukan");
      return;
    }
    sendCommand.mutate({
      actuatorId: roofActuator.id,
      command: "OPEN",
      issuedBy: "user:web",
    });
  };

  const handleCloseRoof = () => {
    if (!roofActuator) {
      toast.error("Actuator roof tidak ditemukan");
      return;
    }
    sendCommand.mutate({
      actuatorId: roofActuator.id,
      command: "CLOSE",
      issuedBy: "user:web",
    });
  };

  const handlePumpOn = () => {
    if (!pumpActuator) {
      toast.error("Actuator pump tidak ditemukan");
      return;
    }
    sendCommand.mutate({
      actuatorId: pumpActuator.id,
      command: "ON",
      issuedBy: "user:web",
    });
  };

  const handlePumpOff = () => {
    if (!pumpActuator) {
      toast.error("Actuator pump tidak ditemukan");
      return;
    }
    sendCommand.mutate({
      actuatorId: pumpActuator.id,
      command: "OFF",
      issuedBy: "user:web",
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });
  };

  // Show loading state
  if (loadingReadings || loadingActuators) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h1 className="text-xl font-bold text-gray-900">
            Greenhouse Monitoring Dashboard
          </h1>
          <div className="flex flex-wrap gap-3 items-center text-xs mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600">WebSocket:</span>
              <span
                className={`font-medium ${
                  isConnected ? "text-green-600" : "text-red-600"
                }`}
              >
                {isConnected ? "Connected" : "Disconnected"}{" "}
                {isConnected ? "✅" : "❌"}
              </span>
            </div>
            <div className="text-gray-300">|</div>
            <div className="text-gray-600">
              Last Update: {formatTime(lastUpdate)} WIB
            </div>
          </div>
        </div>

        {/* Sensor Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <SensorCard
            title="Suhu"
            value={
              sensorData?.temperature?.value
                ? `${sensorData.temperature.value}°C`
                : "N/A"
            }
            icon={Thermometer}
            iconColor="text-red-500"
          />
          <SensorCard
            title="Kelembaban Udara"
            value={
              sensorData?.humidity?.value
                ? `${sensorData.humidity.value}%`
                : "N/A"
            }
            icon={Droplet}
            iconColor="text-blue-500"
          />
          <SensorCard
            title="Kelembaban Tanah"
            value={
              sensorData?.soil?.value ? `${sensorData.soil.value}%` : "N/A"
            }
            icon={Sprout}
            status={
              sensorData?.soil?.value
                ? getSoilMoistureStatus(sensorData.soil.value)
                : "-"
            }
            iconColor="text-green-600"
          />
          <SensorCard
            title="Intensitas Cahaya"
            value={
              sensorData?.light?.value ? `${sensorData.light.value} lux` : "N/A"
            }
            icon={Sun}
            status={
              sensorData?.light?.value
                ? getLightStatus(sensorData.light.value)
                : "-"
            }
            iconColor="text-yellow-500"
          />
          <SensorCard
            title="Status Hujan"
            value={
              sensorData?.rain?.value !== null &&
              sensorData?.rain?.value !== undefined
                ? sensorData.rain.value === 1
                  ? "Hujan"
                  : "Tidak Hujan"
                : "N/A"
            }
            icon={CloudRain}
            iconColor={
              sensorData?.rain?.value === 1 ? "text-blue-600" : "text-gray-400"
            }
          />
        </div>

        {/* Status & Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActuatorStatus
            roofStatus={roofActuator?.state || "CLOSED"}
            pumpStatus={pumpActuator?.state || "OFF"}
          />
          <ControlPanel
            onRoofOpen={handleOpenRoof}
            onRoofClose={handleCloseRoof}
            onPumpOn={handlePumpOn}
            onPumpOff={handlePumpOff}
            isLoading={sendCommand.isPending}
          />
        </div>

        {/* Historical Chart */}
        {loadingHistory ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center text-gray-600">
              Loading chart data...
            </div>
          </div>
        ) : (
          <HistoricalChart data={chartData} />
        )}
      </div>
    </div>
  );
}
