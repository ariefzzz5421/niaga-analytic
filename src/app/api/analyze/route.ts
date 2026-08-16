import { NextRequest } from "next/server";
import { z } from "zod";

import { analyzeStore } from "@/lib/analyzer";
import { UnsupportedUrlError } from "@/lib/platform";
import { GatewayError } from "@/lib/scrape/gateway";
import type { ProgressEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BodySchema = z.object({
  url: z.string().min(3, "Store URL is required."),
  /** Stream progress as SSE instead of returning one JSON blob. */
  stream: z.boolean().optional(),
  sample: z.boolean().optional(),
  refresh: z.boolean().optional(),
});

function errorPayload(err: unknown): { status: number; body: Record<string, unknown> } {
  if (err instanceof UnsupportedUrlError) {
    return { status: 400, body: { error: err.message, kind: "unsupported-url" } };
  }
  if (err instanceof GatewayError) {
    return {
      status: 502,
      body: { error: err.message, kind: "upstream-blocked", attempts: err.attempts },
    };
  }
  return {
    status: 500,
    body: { error: err instanceof Error ? err.message : "Analysis failed.", kind: "unknown" },
  };
}

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request body.";
    return Response.json({ error: message, kind: "bad-request" }, { status: 400 });
  }

  if (!parsed.stream) {
    try {
      const analysis = await analyzeStore({
        url: parsed.url,
        forceSample: parsed.sample,
        refresh: parsed.refresh,
        signal: req.signal,
      });
      return Response.json(analysis);
    } catch (err) {
      const { status, body } = errorPayload(err);
      return Response.json(body, { status });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const analysis = await analyzeStore({
          url: parsed.url,
          forceSample: parsed.sample,
          refresh: parsed.refresh,
          signal: req.signal,
          onProgress: (p: ProgressEvent) => send("progress", p),
        });
        send("result", analysis);
      } catch (err) {
        send("failed", errorPayload(err).body);
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Stops nginx/Vercel edge buffering, which would defeat the point.
      "x-accel-buffering": "no",
    },
  });
}
