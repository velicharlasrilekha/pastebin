import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import crypto from "crypto";
import { nowMs } from "@/lib/time";

export async function POST(req: Request) {
  const body = await req.json();
  const { content, ttl_seconds, max_views } = body;

  // Validation
  if (!content || typeof content !== "string" || content.trim() === "") {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }

  if (
    ttl_seconds !== undefined &&
    (!Number.isInteger(ttl_seconds) || ttl_seconds < 1)
  ) {
    return NextResponse.json({ error: "Invalid ttl_seconds" }, { status: 400 });
  }

  if (
    max_views !== undefined &&
    (!Number.isInteger(max_views) || max_views < 1)
  ) {
    return NextResponse.json({ error: "Invalid max_views" }, { status: 400 });
  }

  const id = crypto.randomUUID().slice(0, 8);

  const now = await nowMs();
  const expiresAt = ttl_seconds ? now + ttl_seconds * 1000 : null;

  await redis.hset(`paste:${id}`, {
    content,
    expires_at: expiresAt,
    remaining: max_views ?? null,
  });

  // ✅ Build URL from request origin
  const origin = new URL(req.url).origin;

  return NextResponse.json({
    id,
    url: `${origin}/p/${id}`,
  });
}
