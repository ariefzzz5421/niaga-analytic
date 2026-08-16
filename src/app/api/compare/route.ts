import { NextRequest } from "next/server";
import { z } from "zod";

import { analyzeStore } from "@/lib/analyzer";
import type { StoreAnalysis } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const BodySchema = z.object({
  urls: z.array(z.string().min(3)).min(2, "Give at least two stores to compare.").max(4),
  sample: z.boolean().optional(),
});

export interface CompareRow {
  url: string;
  ok: boolean;
  analysis?: StoreAnalysis;
  error?: string;
}

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request body.";
    return Response.json({ error: message }, { status: 400 });
  }

  // Stores are independent, so fan out rather than walking the list.
  const rows: CompareRow[] = await Promise.all(
    parsed.urls.map(async (url) => {
      try {
        const analysis = await analyzeStore({ url, forceSample: parsed.sample, signal: req.signal });
        return { url, ok: true, analysis };
      } catch (err) {
        return { url, ok: false, error: err instanceof Error ? err.message : "Analysis failed." };
      }
    }),
  );

  return Response.json({ rows });
}
