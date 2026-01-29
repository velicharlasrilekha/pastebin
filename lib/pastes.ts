import { redis } from "@/lib/redis";
import { nowMs } from "@/lib/time";

export async function getPasteById(id: string) {
  const key = `paste:${id}`;
  const data = await redis.hgetall<any>(key);

  if (!data || !data.content) return null;

  // TTL check
  if (data.expires_at && nowMs() > Number(data.expires_at)) {
    await redis.del(key);
    return null;
  }

  // View count check
  if (data.remaining !== null) {
    const remaining = await redis.hincrby(key, "remaining", -1);
    if (remaining < 0) {
      await redis.del(key);
      return null;
    }
  }

  return {
    content: data.content,
    remaining_views:
      data.remaining !== null ? Math.max(0, Number(data.remaining) - 1) : null,
    expires_at: data.expires_at
      ? new Date(Number(data.expires_at)).toISOString()
      : null,
  };
}
