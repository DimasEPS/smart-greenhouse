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
          // Update latest readings cache
          queryClient.invalidateQueries({
            queryKey: queryKeys.readings.latest,
          });
          queryClient.invalidateQueries({
            queryKey: ["readings", "historical"],
          });
          setLastUpdate(new Date());
          break;

        case "actuator_status":
          // Update actuator status
          queryClient.invalidateQueries({ queryKey: queryKeys.actuators });
          if (message.data?.actuatorId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.actuatorStatus(message.data.actuatorId),
            });
          }
          break;

        case "command_ack":
          // Show acknowledgment
          if (message.data?.success) {
            toast.success(`Perintah dikonfirmasi oleh ESP8266`);
          } else {
            toast.error(
              `Perintah gagal: ${message.data?.error || "Unknown error"}`
            );
          }
          break;
      }
    };

    handleWebSocketMessage(lastMessage);
  }, [lastMessage, queryClient]);

  // Parse sensor data from latest readings
  const sensorData = useMemo(() => {
    if (!latestReadings?.data) return null;

    const readings = latestReadings.data;
    const data = {
      temperature: null,
      humidity: null,
      soilMoisture: null,
      lightIntensity: null,
      isRaining: null,
    };

    readings.forEach((reading) => {
      switch (reading.sensor.type) {
        case "DHT11_TEMP":
          data.temperature = reading.value;
          break;
        case "DHT11_HUMIDITY":
          data.humidity = reading.value;
          break;
        case "SOIL_MOISTURE":
          data.soilMoisture = reading.value;
          break;
        case "LDR":
          data.lightIntensity = reading.value;
          break;
        case "RAIN":
          data.isRaining = reading.value === 1;
          break;
      }
    });

    return data;
  }, [latestReadings]);

  // Parse actuator status
  const roofActuator = actuators?.data?.find((a) => a.type === "SERVO_MG996R");
  const pumpActuator = actuators?.data?.find((a) => a.type === "RELAY");

  // Format historical data for chart
  const chartData = useMemo(() => {
    if (!historicalData?.data) return [];

    // Group readings by time
    const groupedByTime = {};

    historicalData.data.forEach((reading) => {
      const time = new Date(reading.recordedAt);
      const hourKey = `${time.getHours().toString().padStart(2, "0")}:00`;

      if (!groupedByTime[hourKey]) {
        groupedByTime[hourKey] = {
          time: hourKey,
          suhu: null,
          kelembabanUdara: null,
          kelembabanTanah: null,
        };
      }

      switch (reading.sensor.type) {
        case "DHT11_TEMP":
          groupedByTime[hourKey].suhu = reading.value;
          break;
        case "DHT11_HUMIDITY":
          groupedByTime[hourKey].kelembabanUdara = reading.value;
          break;
        case "SOIL_MOISTURE":
          groupedByTime[hourKey].kelembabanTanah = reading.value;
          break;
      }
    });

    return Object.values(groupedByTime).slice(-24); // Last 24 hours
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
              sensorData?.temperature ? `${sensorData.temperature}°C` : "N/A"
            }
            icon={Thermometer}
            iconColor="text-red-500"
          />
          <SensorCard
            title="Kelembaban Udara"
            value={sensorData?.humidity ? `${sensorData.humidity}%` : "N/A"}
            icon={Droplet}
            iconColor="text-blue-500"
          />
          <SensorCard
            title="Kelembaban Tanah"
            value={
              sensorData?.soilMoisture ? `${sensorData.soilMoisture}%` : "N/A"
            }
            icon={Sprout}
            status={getSoilMoistureStatus(sensorData?.soilMoisture)}
            iconColor="text-green-600"
          />
          <SensorCard
            title="Intensitas Cahaya"
            value={sensorData?.lightIntensity || "N/A"}
            icon={Sun}
            status={getLightStatus(sensorData?.lightIntensity)}
            iconColor="text-yellow-500"
          />
          <SensorCard
            title="Status Hujan"
            value={
              sensorData?.isRaining !== null
                ? sensorData.isRaining
                  ? "Hujan"
                  : "Tidak Hujan"
                : "N/A"
            }
            icon={CloudRain}
            iconColor={
              sensorData?.isRaining ? "text-blue-600" : "text-gray-400"
            }
          />
        </div>

        {/* Status & Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActuatorStatus
            roofStatus={roofActuator?.state === "active" ? "OPEN" : "CLOSED"}
            pumpStatus={pumpActuator?.state === "active" ? "ON" : "OFF"}
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
