import type { SessionConfig } from '../types'
import { Resource } from './resource'

export class SessionConfigResource extends Resource {
  static resourcePath = 'session_config'

  async fetch(): Promise<SessionConfig> {
    const response = await this.client.get(this.path())
    const parsed = response.bodyParsed as Record<string, unknown>

    return {
      sessionLifetimeHours: parsed.session_lifetime_hours as number,
      sessionIdleTimeoutMinutes: parsed.session_idle_timeout_minutes as number | null,
      singleSessionPerDevice: parsed.single_session_per_device as boolean,
      maxConcurrentSessions: parsed.max_concurrent_sessions as number,
    }
  }
}
