/**
 * POST /api/level  —  the streaming loop.
 *
 * Body: { source?: string, image?: { base64, mediaType } }
 * Response: Server-Sent Events, one JSON RunEvent per message.
 *
 * Reliability contract from the brief: no key, or any failure, degrades to the
 * cached run rather than an error screen. The demo has to survive dead wifi.
 */

import { deriveBands } from "@/lib/bands";
import { ROSTER, loadCachedRun } from "@/lib/demo-data";
import { hasApiKey } from "@/lib/anthropic";
import { runPipeline, transcribeImage } from "@/lib/pipeline";
import { replayRun } from "@/lib/replay";
import type { RunEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  source?: string;
  image?: { base64: string; mediaType: string };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let open = true;
      const send = (event: RunEvent) => {
        if (!open) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const close = () => {
        if (!open) return;
        open = false;
        controller.close();
      };

      // No key at all → cached run, honestly badged.
      if (!hasApiKey()) {
        const cached = loadCachedRun();
        if (cached) await replayRun(cached, send);
        else send({ type: "error", message: "No API key and no cached run available." });
        return close();
      }

      try {
        let source = body.source?.trim() ?? "";
        if (body.image?.base64) {
          source = await transcribeImage(body.image.base64, body.image.mediaType);
        }
        if (!source) {
          send({ type: "error", message: "Nothing to rewrite — paste a passage or drop an image." });
          return close();
        }
        const bands = deriveBands(ROSTER);
        await runPipeline(source, bands, send);
      } catch (err) {
        // A live call died mid-run. Fall back to the cached run so the stage demo
        // still completes; the fresh meta(cached:true) tells the client to reset.
        const cached = loadCachedRun();
        if (cached) await replayRun(cached, send);
        else send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
