import { Appointment } from '../entities/Appointment';

/**
 * BackgroundTaskRunner Interface
 * Abstraction layer to run background processes.
 * Ensures the repository remains Cloud-Agnostic by isolating platform-specific APIs
 * (like Cloudflare Worker's c.executionCtx.waitUntil).
 */
export interface BackgroundTaskRunner {
  run(task: () => Promise<void>): void;
}

/**
 * AppointmentRepository Interface
 * Pure domain-level contract defining operations permitted on the Appointment entity.
 */
export interface AppointmentRepository {
  save(appointment: Appointment): Promise<void>;
}
