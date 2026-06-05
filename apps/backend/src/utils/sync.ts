import { drizzle } from 'drizzle-orm/d1';
import { appointments as appointmentsTable } from '../db/schema';
import type { Bindings } from '../types';

/**
 * Synchronizes sync events recorded in R2 to the D1_ANALYTICS database.
 * Orders files chronologically, processes them, writes them to the read database,
 * and deletes successfully processed files from the R2 queue.
 */
export async function syncR2ToAnalytics(env: Bindings): Promise<void> {
  if (!env.SYNC_BUCKET) {
    console.error('[Sync-Cron] SYNC_BUCKET is not bound.');
    return;
  }

  if (!env.D1_ANALYTICS) {
    console.error('[Sync-Cron] D1_ANALYTICS is not bound.');
    return;
  }

  // 1. List pending replication files
  const listResult = await env.SYNC_BUCKET.list({ prefix: 'queue/' });
  const objects = listResult.objects;

  if (objects.length === 0) {
    return;
  }

  const dbAnalytics = drizzle(env.D1_ANALYTICS);
  const processedKeys: string[] = [];

  // Sort objects alphabetically (chongolocial order because of Date.now() suffix in names)
  const sortedObjects = [...objects].sort((a, b) => a.key.localeCompare(b.key));

  // 2. Process each sync event
  for (const objRef of sortedObjects) {
    try {
      const obj = await env.SYNC_BUCKET.get(objRef.key);
      if (!obj) continue;

      const payload = await obj.json() as {
        entityName: string;
        action: string;
        data: {
          id: string;
          patientName: string;
          appointmentDate: string;
          status: string;
          createdAt: string;
        };
      };

      if (payload.entityName === 'Appointment') {
        const data = payload.data;
        
        // Upsert the appointment data into the analytics database
        await dbAnalytics
          .insert(appointmentsTable)
          .values({
            id: data.id,
            patientName: data.patientName,
            appointmentDate: new Date(data.appointmentDate),
            status: data.status,
            createdAt: new Date(data.createdAt),
          })
          .onConflictDoUpdate({
            target: appointmentsTable.id,
            set: {
              patientName: data.patientName,
              appointmentDate: new Date(data.appointmentDate),
              status: data.status,
            },
          });
      }

      processedKeys.push(objRef.key);
    } catch (err) {
      console.error(`[Sync-Cron] Failed processing R2 object ${objRef.key}:`, err);
      // Fail-safe: Skip key deletion so it will be retried in the next Scheduled run.
    }
  }

  // 3. Delete successfully processed files from the R2 queue
  for (const key of processedKeys) {
    try {
      await env.SYNC_BUCKET.delete(key);
    } catch (delErr) {
      console.error(`[Sync-Cron] Failed to delete R2 object ${key} from queue:`, delErr);
    }
  }

  console.log(`[Sync-Cron] Synchronized ${processedKeys.length} updates to D1_ANALYTICS.`);
}
