import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { R2Bucket } from '@cloudflare/workers-types';
import { Appointment } from '../../domain/entities/Appointment';
import type { AppointmentRepository } from '../../domain/repositories/AppointmentRepository';
import { appointments as appointmentsTable, syncFallbacks as syncFallbacksTable } from '../../db/schema';

/**
 * DrizzleAppointmentRepository
 * Concrete adapter implementing the AppointmentRepository contract using Drizzle ORM.
 * Implements the CQRS Lite write isolation strategy via durable R2 file-based queuing.
 */
export class DrizzleAppointmentRepository implements AppointmentRepository {
  constructor(
    private readonly dbMain: DrizzleD1Database<any>,
    private readonly r2Bucket: R2Bucket
  ) {}

  /**
   * Persists an Appointment entity.
   * Performs a synchronous write to D1_MAIN and writes the replication payload to R2.
   */
  async save(appointment: Appointment): Promise<void> {
    // 1. Synchronously insert or update in the Operational Database (D1_MAIN / OLTP)
    await this.dbMain
      .insert(appointmentsTable)
      .values({
        id: appointment.id,
        patientName: appointment.patientName,
        appointmentDate: appointment.appointmentDate,
        status: appointment.status,
        createdAt: appointment.createdAt,
      })
      .onConflictDoUpdate({
        target: appointmentsTable.id,
        set: {
          patientName: appointment.patientName,
          appointmentDate: appointment.appointmentDate,
          status: appointment.status,
        },
      });

    // 2. Write the replication event payload to R2
    const eventPayload = {
      entityName: 'Appointment',
      action: 'upsert',
      data: {
        id: appointment.id,
        patientName: appointment.patientName,
        appointmentDate: appointment.appointmentDate.toISOString(),
        status: appointment.status,
        createdAt: appointment.createdAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    const filename = `queue/appointment_${appointment.id}_${Date.now()}.json`;
    try {
      await this.r2Bucket.put(filename, JSON.stringify(eventPayload));
    } catch (r2Error) {
      console.error(
        `[CQRS-R2] Failed writing sync payload to R2 for appointment ${appointment.id}:`,
        r2Error
      );

      // 3. Fallback and Resilience block: Write the sync failure log back to the Operational Database (D1_MAIN)
      try {
        const errorMessage =
          r2Error instanceof Error ? r2Error.message : String(r2Error);

        await this.dbMain
          .insert(syncFallbacksTable)
          .values({
            id: crypto.randomUUID(),
            entityName: 'Appointment',
            recordId: appointment.id,
            error: `R2 Write Failure: ${errorMessage}`,
            createdAt: new Date(),
          });
      } catch (fallbackError) {
        console.error(
          `[CQRS-Fallback] CRITICAL: Failed writing sync fallback for appointment ${appointment.id}:`,
          fallbackError
        );
      }
    }
  }
}
