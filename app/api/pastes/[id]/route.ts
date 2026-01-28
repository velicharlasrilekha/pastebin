import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { nowMs } from "@/lib/time";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const key = `paste:${id}`;

  const data = await redis.hgetall<any>(key);

  if (!data || !data.content) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ✅ FIX: await nowMs()
  const now = await nowMs();

  // TTL check
  if (data.expires_at && now > Number(data.expires_at)) {
    await redis.del(key);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let remainingViews: number | null = null;

  // View count check
  if (data.remaining !== null) {
    const remaining = await redis.hincrby(key, "remaining", -1);

    if (remaining < 0) {
      await redis.del(key);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    remainingViews = remaining;
  }

  return NextResponse.json({
    content: data.content,
    remaining_views: remainingViews,
    expires_at: data.expires_at
      ? new Date(Number(data.expires_at)).toISOString()
      : null,
  });
}
