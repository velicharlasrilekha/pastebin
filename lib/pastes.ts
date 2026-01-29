import { redis } from "@/lib/redis";
import { nowMs } from "@/lib/time";

export type Paste = {
  content: string;
  expires_at: number | null;
  remaining_views: number | null;
};

export async function getPasteById(id: string): Promise<Paste | null> {
  const key = `paste:${id}`;
  const data = await redis.hgetall(key);

  if (!data || typeof data.content !== "string") {
    return null;
  }

  const now = await nowMs();

  // TTL check
  if (data.expires_at && now > Number(data.expires_at)) {
    await redis.del(key);
    return null;
  }

  // Max views check
  let remainingViews: number | null = null;

  if (data.remaining !== null && data.remaining !== undefined) {
    const remaining = Number(data.remaining);

    if (remaining <= 0) {
      await redis.del(key);
      return null;
    }

    await redis.hincrby(key, "remaining", -1);
    remainingViews = remaining - 1;
  }

  return {
    content: data.content,
    expires_at: data.expires_at ? Number(data.expires_at) : null,
    remaining_views: remainingViews,
  };
}
