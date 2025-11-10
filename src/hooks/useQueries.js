/**
 * React Query Hooks
 * Custom hooks for data fetching with caching
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sensorsApi, readingsApi, actuatorsApi } from "@/lib/api";
import { toast } from "sonner";

// ========== Query Keys ==========
export const queryKeys = {
  sensors: ["sensors"],
  readings: {
    latest: ["readings", "latest"],
    historical: (params) => ["readings", "historical", params],
  },
  actuators: ["actuators"],
  actuatorStatus: (id) => ["actuators", id, "status"],
  actuatorCommands: (id) => ["actuators", id, "commands"],
};

// ========== Sensors Queries ==========

export function useSensors() {
  return useQuery({
    queryKey: queryKeys.sensors,
    queryFn: sensorsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ========== Readings Queries ==========

export function useLatestReadings(options = {}) {
  return useQuery({
    queryKey: queryKeys.readings.latest,
    queryFn: async () => {
      const response = await readingsApi.getLatest();
      // Extract data array from API response
      return response.data || [];
    },
    refetchInterval: options.refetchInterval ?? 30000, // Default 30s
    staleTime: 10000, // 10 seconds
    ...options,
  });
}

export function useHistoricalReadings(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.readings.historical(params),
    queryFn: async () => {
      const response = await readingsApi.getHistorical(params);
      // Extract data array from API response
      return response.data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options.enabled ?? true,
    ...options,
  });
}

// ========== Actuators Queries ==========

export function useActuators() {
  return useQuery({
    queryKey: queryKeys.actuators,
    queryFn: async () => {
      const response = await actuatorsApi.getAll();
      // Extract data array from API response
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useActuatorStatus(actuatorId, options = {}) {
  return useQuery({
    queryKey: queryKeys.actuatorStatus(actuatorId),
    queryFn: () => actuatorsApi.getStatus(actuatorId),
    enabled: !!actuatorId && (options.enabled ?? true),
    refetchInterval: options.refetchInterval ?? 10000, // Default 10s
    ...options,
  });
}

export function useActuatorCommandHistory(
  actuatorId,
  limit = 20,
  options = {}
) {
  return useQuery({
    queryKey: queryKeys.actuatorCommands(actuatorId),
    queryFn: () => actuatorsApi.getCommandHistory(actuatorId, limit),
    enabled: !!actuatorId && (options.enabled ?? true),
    staleTime: 30000, // 30 seconds
    ...options,
  });
}

// ========== Mutations ==========

export function useSendActuatorCommand(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ actuatorId, command, issuedBy }) =>
      actuatorsApi.sendCommand(actuatorId, command, issuedBy),
    onMutate: async ({ actuatorId, command }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.actuatorStatus(actuatorId),
      });

      // Snapshot the previous value
      const previousStatus = queryClient.getQueryData(
        queryKeys.actuatorStatus(actuatorId)
      );

      // Optimistically update to the new value
      if (previousStatus) {
        queryClient.setQueryData(
          queryKeys.actuatorStatus(actuatorId),
          (old) => ({
            ...old,
            state:
              command === "OPEN" || command === "ON" ? "active" : "inactive",
          })
        );
      }

      return { previousStatus, actuatorId };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousStatus) {
        queryClient.setQueryData(
          queryKeys.actuatorStatus(context.actuatorId),
          context.previousStatus
        );
      }
      toast.error(error.message || "Gagal mengirim perintah");
      options.onError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      toast.success("Perintah berhasil dikirim");

      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.actuatorStatus(variables.actuatorId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.actuatorCommands(variables.actuatorId),
      });

      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useUpdateActuatorStatus(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ actuatorId, state, commandId }) =>
      actuatorsApi.updateStatus(actuatorId, state, commandId),
    onSuccess: (data, variables) => {
      // Update cache
      queryClient.setQueryData(
        queryKeys.actuatorStatus(variables.actuatorId),
        data
      );

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.actuators,
      });

      options.onSuccess?.(data, variables);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || "Gagal update status");
      options.onError?.(error, variables, context);
    },
  });
}

export function useCreateReading(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reading) => readingsApi.create(reading),
    onSuccess: (data, variables) => {
      // Invalidate readings queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.readings.latest,
      });
      queryClient.invalidateQueries({
        queryKey: ["readings", "historical"],
      });

      options.onSuccess?.(data, variables);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || "Gagal menyimpan reading");
      options.onError?.(error, variables, context);
    },
  });
}
