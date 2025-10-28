import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// You can adjust the rate limit below (e.g., 10 requests per minute)
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(10, "60 s"),
  analytics: true,
});
