import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Redis } from '@upstash/redis';

// Bound retries so an unreachable/misconfigured Upstash endpoint fails fast
// instead of a request hanging indefinitely — a hung cross-origin request
// is what browsers report as a generic "CORS error" since it never gets a
// response.
const MAX_RETRIES = 2;

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    // Uses the REST API (HTTP), so there's no persistent TCP connection to
    // manage/reconnect — reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
    this.client = Redis.fromEnv({
      retry: {
        retries: MAX_RETRIES,
        backoff: (retryCount) => Math.min(1000, 50 * 2 ** retryCount),
      },
      // We only ever store plain strings (OTP codes) — without this, the
      // client auto-JSON-parses values, turning numeric-looking OTPs like
      // "990291" into a JS number and breaking Buffer.from() downstream.
      automaticDeserialization: false,
    });
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      this.logger.error(
        `SET failed for key "${key}": ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'OTP service is temporarily unavailable. Please try again shortly.',
      );
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get<string>(key);
    } catch (err) {
      this.logger.error(
        `GET failed for key "${key}": ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'OTP service is temporarily unavailable. Please try again shortly.',
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.error(
        `DEL failed for key "${key}": ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'OTP service is temporarily unavailable. Please try again shortly.',
      );
    }
  }
}
