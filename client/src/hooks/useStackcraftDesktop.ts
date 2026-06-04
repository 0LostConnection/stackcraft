import { useEffect, useRef, useState } from "react";

export type StackcraftHealthSnapshot = {
  dataReady: boolean;
  version: string;
  items: number;
};

export function useStackcraftDesktop() {
  const [isDesktop] = useState(
    () => typeof window !== "undefined" && Boolean(window.stackcraft?.isDesktop),
  );

  useEffect(() => {
    void window.stackcraft?.notifyReady?.();
  }, []);

  return { isDesktop };
}

export type StackcraftImportProgressPayload = {
  phase: string;
  percent?: number;
  phaseId?: string;
  message?: string;
  current?: number;
  total?: number;
};

export function useStackcraftImportProgress(
  onPayload: (payload: StackcraftImportProgressPayload) => void,
) {
  const onPayloadRef = useRef(onPayload);
  onPayloadRef.current = onPayload;

  useEffect(() => {
    const api = window.stackcraft;
    if (!api?.onImportProgress) return;
    return api.onImportProgress((payload) => onPayloadRef.current(payload));
  }, []);
}

export function useStackcraftDataReady(
  onReady: (health: StackcraftHealthSnapshot | null) => void,
) {
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const api = window.stackcraft;
    if (!api?.onDataReady) return;
    return api.onDataReady((health) => onReadyRef.current(health));
  }, []);
}
