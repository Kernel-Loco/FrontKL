"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseFlow, readFlowRaw, type FlowData, type FlowKey } from "@/lib/flowStorage";

const noopSubscribe = () => () => {};

/**
 * Lee el estado de un flujo desde sessionStorage sin romper la hidratación.
 * `ready` es false durante el render del servidor y la hidratación.
 */
export function useFlowState<K extends FlowKey>(key: K): { ready: boolean; data: FlowData[K] | null } {
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const raw = useSyncExternalStore(noopSubscribe, () => readFlowRaw(key), () => null);
  const data = useMemo(() => parseFlow<K>(raw), [raw]);
  return { ready, data };
}
