import Redis from "ioredis"

// Redis Cloud TCP connection
const redisUrl = process.env.REDIS_URL
export const redis = (redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  : (null as unknown as Redis))
