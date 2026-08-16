"use client";

import { useCallback, useRef, useState } from "react";

import type { ProgressEvent, StoreAnalysis } from "./types";

export interface AnalyzeFailure {
  message: string;
  /** `not-configured`, `upstream-blocked`, `unsupported-url`, … */
  kind?: string;
  /** Operator-facing recovery instructions, when the server has any. */
  hint?: string;
}

interface AnalyzeState {
  loading: boolean;
  events: ProgressEvent[];
  analysis: StoreAnalysis | null;
  error: AnalyzeFailure | null;
}

const INITIAL: AnalyzeState = { loading: false, events: [], analysis: null, error: null };

/**
 * Drives `POST /api/analyze` in streaming mode.
 *
 * `EventSource` only speaks GET, so this reads the SSE frames off the fetch
 * body directly. Frames are separated by a blank line; a partial frame at the
 * end of a chunk is held in `buffer` until the rest arrives.
 */
export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>(INITIAL);
  const controllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(INITIAL);
  }, []);

  const run = useCallback(async (url: string, opts: { sample?: boolean; refresh?: boolean } = {}) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState({ loading: true, events: [], analysis: null, error: null });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, stream: true, ...opts }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const detail = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setState((s) => ({
          ...s,
          loading: false,
          error: {
            message: detail.error ?? `HTTP ${res.status}`,
            kind: detail.kind,
            hint: detail.hint,
          },
        }));
        return;
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const eventLine = frame.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const name = eventLine.slice(7).trim();
          const payload = JSON.parse(dataLine.slice(6));

          if (name === "progress") {
            setState((s) => ({ ...s, events: [...s.events, payload as ProgressEvent] }));
          } else if (name === "result") {
            setState((s) => ({ ...s, analysis: payload as StoreAnalysis, loading: false }));
          } else if (name === "failed") {
            setState((s) => ({
              ...s,
              loading: false,
              error: {
                message: payload.error ?? "Analysis failed.",
                kind: payload.kind,
                hint: payload.hint,
              },
            }));
          }
        }
      }

      // The stream can close without a terminal frame if the connection drops.
      setState((s) =>
        s.loading
          ? { ...s, loading: false, error: s.error ?? { message: "Connection closed early." } }
          : s,
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      setState((s) => ({
        ...s,
        loading: false,
        error: { message: err instanceof Error ? err.message : "Analysis failed." },
      }));
    }
  }, []);

  return { ...state, run, reset };
}
