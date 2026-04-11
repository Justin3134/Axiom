import Redis from "ioredis"

// Redis Cloud TCP connection
export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
})
