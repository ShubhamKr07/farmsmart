import { Feather } from "@expo/vector-icons";
import React from "react";
import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

/**
 * Glance-only connectivity indicator — web's TopBar always shows a live
 * Wifi/WifiOff icon; mobile had none anywhere, so an API outage showed up
 * only as unexplained per-screen spinners/failures (Phase 4.1).
 */
export default function HealthIndicator() {
  const colors = useColors();
  const health = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30_000, staleTime: 15_000 },
  });

  const isHealthy = !health.isLoading && !health.isError && health.data?.status === "ok";

  return (
    <Feather
      name={isHealthy ? "wifi" : "wifi-off"}
      size={16}
      color={isHealthy ? colors.primary : colors.destructive}
      accessibilityLabel={isHealthy ? "API connected" : "API unreachable"}
    />
  );
}
