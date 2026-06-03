import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { Appointment } from '../../domain/entities/Appointment';
import type { AppointmentRepository, BackgroundTaskRunner } from '../../domain/repositories/AppointmentRepository';
import { appointments as appointmentsTable, syncFallbacks as syncFallbacksTable } from '../../db/schema';

/**
 * DrizzleAppointmentRepository
 * Concrete adapter implementing the AppointmentRepository contract using Drizzle ORM.
 * Implements the CQRS Lite write isolation strategy.
 */
export class DrizzleAppointmentRepository implements AppointmentRepository {
  constructor(
    private readonly dbMain: DrizzleD1Database<any>,
    private readonly dbAnalytics: DrizzleD1Database<any>,
    private readonly taskRunner: BackgroundTaskRunner
  ) {}

  /**
   * Persists an Appointment entity.
   * Performs a synchronous write to D1_MAIN and schedules an asynchronous replication to D1_ANALYTICS.
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

    // 2. Schedule non-blocking async replication to the Analytics Database (D1_ANALYTICS / OLAP)
    this.taskRunner.run(async () => {
      try {
        await this.dbAnalytics
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
      } catch (analyticsError) {
        // Log the failure to the console
        console.error(
          `[CQRS-Sync] Failed replicating appointment ${appointment.id} to D1_ANALYTICS:`,
          analyticsError
        );

        // 3. Fallback and Resilience block: Write the sync failure log back to the Operational Database (D1_MAIN)
        try {
          const errorMessage =
            analyticsError instanceof Error ? analyticsError.message : String(analyticsError);

          await this.dbMain
            .insert(syncFallbacksTable)
            .values({
              id: crypto.randomUUID(),
              entityName: 'Appointment',
              recordId: appointment.id,
              error: errorMessage,
              createdAt: new Date(),
            });
        } catch (fallbackError) {
          console.error(
            `[CQRS-Fallback] CRITICAL: Failed writing sync fallback for appointment ${appointment.id}:`,
            fallbackError
          );
        }
      }
    });
  }
}
