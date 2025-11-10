/**
 * API Client
 * Utility functions for making API requests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function fetcher(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || "An error occurred",
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError("Network error", 0, { message: error.message });
  }
}

// ========== Sensors API ==========

export const sensorsApi = {
  getAll: () => fetcher("/sensors"),
};

// ========== Readings API ==========

export const readingsApi = {
  getLatest: () => fetcher("/readings/latest"),

  getHistorical: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.range) queryParams.append("range", params.range);
    if (params.sensorId) queryParams.append("sensorId", params.sensorId);
    if (params.sensorType) queryParams.append("sensorType", params.sensorType);
    if (params.limit) queryParams.append("limit", params.limit);

    const query = queryParams.toString();
    return fetcher(`/readings${query ? `?${query}` : ""}`);
  },

  create: (reading) =>
    fetcher("/readings", {
      method: "POST",
      body: JSON.stringify(reading),
    }),
};

// ========== Actuators API ==========

export const actuatorsApi = {
  getAll: () => fetcher("/actuators"),

  getStatus: (actuatorId) => fetcher(`/actuators/${actuatorId}/status`),

  sendCommand: (actuatorId, command, issuedBy = "user:web") =>
    fetcher(`/actuators/${actuatorId}/commands`, {
      method: "POST",
      body: JSON.stringify({ command, issuedBy }),
    }),

  updateStatus: (actuatorId, state, commandId = null) =>
    fetcher(`/actuators/${actuatorId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ state, commandId }),
    }),

  getCommandHistory: (actuatorId, limit = 20) =>
    fetcher(`/actuators/${actuatorId}/commands?limit=${limit}`),
};

// ========== WebSocket API ==========

export const wsApi = {
  getClients: () => fetcher("/ws/clients"),
};

// ========== Health API ==========

export const healthApi = {
  check: () => fetcher("/health"),
};

export { ApiError };
