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
  const [timeRange, setTimeRange] = useState("24h");

  // React Query hooks
  const { data: latestReadings, isLoading: loadingReadings } =
    useLatestReadings({
      refetchInterval: 10000, // 10 seconds (more responsive)
    });

  const { data: actuators, isLoading: loadingActuators } = useActuators();

  const { data: historicalData, isLoading: loadingHistory } =
    useHistoricalReadings({
      range: timeRange,
      limit: timeRange === "24h" ? 100 : timeRange === "7d" ? 500 : 1000,
    });

  const sendCommand = useSendActuatorCommand();

  // WebSocket connection
  const { isConnected, lastMessage } = useWebSocket("ws://localhost:3000/ws");

  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const handleWebSocketMessage = async (message) => {
      switch (message.type) {
        case "sensor_reading":
          console.log("[Dashboard] Received sensor reading via WebSocket");
          // Update last update timestamp
          setLastUpdate(new Date());
          // Force refetch queries immediately
          await queryClient.refetchQueries({
            queryKey: queryKeys.readings.latest,
          });
          await queryClient.refetchQueries({
            queryKey: ["readings", "historical"],
          });
          break;

        case "actuator_status":
          console.log("[Dashboard] Received actuator status via WebSocket");
          // Force refetch actuator queries
          await queryClient.refetchQueries({ queryKey: ["actuators"] });
          if (message.data?.actuatorId) {
            await queryClient.refetchQueries({
              queryKey: queryKeys.actuatorStatus(message.data.actuatorId),
            });
          }
          break;

        case "command_ack":
          console.log("[Dashboard] Received command acknowledgment");
          // Force refetch actuator queries to update state
          await queryClient.refetchQueries({ queryKey: ["actuators"] });
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

    // Determine grouping interval based on time range
    const getGroupingInterval = (range) => {
      switch (range) {
        case "24h":
          return 10; // 10 minutes
        case "7d":
          return 60; // 1 hour
        case "30d":
          return 240; // 4 hours
        default:
          return 10;
      }
    };

    const intervalMinutes = getGroupingInterval(timeRange);

    // Group readings by time interval with proper date handling
    const groupedByTime = {};

    historicalData.forEach((reading) => {
      const time = new Date(reading.recordedAt);

      // Create time key based on interval
      let timeKey;
      if (timeRange === "24h") {
        // For 24h: show HH:MM
        const minutes =
          Math.floor(time.getMinutes() / intervalMinutes) * intervalMinutes;
        timeKey = `${time.getHours().toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;
      } else if (timeRange === "7d") {
        // For 7d: show DD/MM HH:00
        const hours = time.getHours();
        timeKey = `${time.getDate().toString().padStart(2, "0")}/${(
          time.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")} ${hours.toString().padStart(2, "0")}:00`;
      } else {
        // For 30d: show DD/MM
        timeKey = `${time.getDate().toString().padStart(2, "0")}/${(
          time.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}`;
      }

      if (!groupedByTime[timeKey]) {
        groupedByTime[timeKey] = {
          time: timeKey,
          timestamp: time.getTime(), // Add timestamp for proper sorting
          suhu: null,
          kelembabanUdara: null,
          kelembabanTanah: null,
          count: { suhu: 0, kelembabanUdara: 0, kelembabanTanah: 0 },
          sum: { suhu: 0, kelembabanUdara: 0, kelembabanTanah: 0 },
        };
      }

      // Accumulate values for averaging
      switch (reading.sensor.type) {
        case "temperature":
          groupedByTime[timeKey].sum.suhu += reading.value;
          groupedByTime[timeKey].count.suhu += 1;
          break;
        case "humidity":
          groupedByTime[timeKey].sum.kelembabanUdara += reading.value;
          groupedByTime[timeKey].count.kelembabanUdara += 1;
          break;
        case "soil":
          groupedByTime[timeKey].sum.kelembabanTanah += reading.value;
          groupedByTime[timeKey].count.kelembabanTanah += 1;
          break;
      }
    });

    // Calculate averages and format data
    const formattedData = Object.values(groupedByTime).map((group) => ({
      time: group.time,
      timestamp: group.timestamp,
      suhu:
        group.count.suhu > 0
          ? Math.round((group.sum.suhu / group.count.suhu) * 10) / 10
          : null,
      kelembabanUdara:
        group.count.kelembabanUdara > 0
          ? Math.round(
              (group.sum.kelembabanUdara / group.count.kelembabanUdara) * 10
            ) / 10
          : null,
      kelembabanTanah:
        group.count.kelembabanTanah > 0
          ? Math.round(
              (group.sum.kelembabanTanah / group.count.kelembabanTanah) * 10
            ) / 10
          : null,
    }));

    // Sort by timestamp and limit data points
    const maxDataPoints =
      timeRange === "24h" ? 50 : timeRange === "7d" ? 100 : 150;

    return formattedData
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-maxDataPoints)
      .map(({ timestamp, ...rest }) => rest); // Remove timestamp from final data
  }, [historicalData, timeRange]);

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
          <HistoricalChart
            data={chartData}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        )}
      </div>
    </div>
  );
}
