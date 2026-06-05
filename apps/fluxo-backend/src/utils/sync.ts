import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { appointments as appointmentsTable, syncFallbacks as syncFallbacksTable, patientsStub as patientsStubTable } from '../db/schema';
import type { Bindings } from '../types';

/**
 * Synchronizes sync events recorded in R2 and sync_fallbacks table to the D1_ANALYTICS database.
 * Orders files chronologically, processes them, writes them to the read database,
 * and deletes successfully processed files from the R2 queue and sync_fallbacks.
 */
export async function syncR2ToAnalytics(env: Bindings): Promise<void> {
  if (!env.D1_MAIN) {
    console.error('[Sync-Cron] D1_MAIN is not bound.');
    return;
  }

  if (!env.SYNC_BUCKET) {
    console.error('[Sync-Cron] SYNC_BUCKET is not bound.');
    return;
  }

  if (!env.D1_ANALYTICS) {
    console.error('[Sync-Cron] D1_ANALYTICS is not bound.');
    return;
  }

  const dbMain = drizzle(env.D1_MAIN);
  const dbAnalytics = drizzle(env.D1_ANALYTICS);

  // 1. Fetch all fallback records from D1_MAIN
  const fallbacks = await dbMain.select().from(syncFallbacksTable);

  // 2. List all pending replication files in R2 queue
  const listResult = await env.SYNC_BUCKET.list({ prefix: 'queue/' });
  const objects = listResult.objects;

  // 3. Define and unify event references
  interface EventRef {
    type: 'R2' | 'Fallback';
    keyOrId: string;
    entityName: string;
    recordId: string;
    timestamp: number;
  }

  const eventRefs: EventRef[] = [];

  for (const fallback of fallbacks) {
    eventRefs.push({
      type: 'Fallback',
      keyOrId: fallback.id,
      entityName: fallback.entityName,
      recordId: fallback.recordId,
      timestamp: fallback.createdAt.getTime(),
    });
  }

  for (const obj of objects) {
    // Key format: queue/appointment_id_timestamp.json
    const match = obj.key.match(/^queue\/([a-zA-Z0-9-]+)_([a-zA-Z0-9-]+)_(\d+)\.json$/);
    if (match && match[1] && match[2] && match[3]) {
      const rawEntity = match[1];
      const recordId = match[2];
      const rawTimestamp = match[3];

      let entityName = rawEntity;
      if (rawEntity === 'appointment') {
        entityName = 'Appointment';
      } else {
        entityName = rawEntity.charAt(0).toUpperCase() + rawEntity.slice(1);
      }
      eventRefs.push({
        type: 'R2',
        keyOrId: obj.key,
        entityName,
        recordId,
        timestamp: parseInt(rawTimestamp, 10),
      });
    }
  }

  if (eventRefs.length === 0) {
    return;
  }

  // 4. Group event references by unique entity ID (entityName:recordId)
  const groups = new Map<string, EventRef[]>();
  for (const ref of eventRefs) {
    const groupKey = `${ref.entityName}:${ref.recordId}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(ref);
  }

  let synchronizedEntities = 0;

  // 5. Process each group: sort chronologically, execute latest state, and delete references
  for (const [groupKey, refs] of groups.entries()) {
    const sortedRefs = [...refs].sort((a, b) => a.timestamp - b.timestamp);
    const latestRef = sortedRefs[sortedRefs.length - 1]!;

    try {
      let success = false;

      if (latestRef.type === 'R2') {
        const obj = await env.SYNC_BUCKET.get(latestRef.keyOrId);
        if (obj) {
          const payload = await obj.json() as any;

          if (payload.entityName === 'Appointment') {
            const data = payload.data;
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
            success = true;
          } else if (payload.entityName === 'Patient') {
            const data = payload.data;
            const incomingUpdatedAt = new Date(data.updatedAt);

            const [existingStub] = await dbMain
              .select()
              .from(patientsStubTable)
              .where(eq(patientsStubTable.id, data.id));

            if (!existingStub || incomingUpdatedAt.getTime() > existingStub.updatedAt.getTime()) {
              await dbMain
                .insert(patientsStubTable)
                .values({
                  id: data.id,
                  tenantId: data.tenantId,
                  name: data.name,
                  cpf: data.cpf,
                  phone: data.phone,
                  updatedAt: incomingUpdatedAt,
                })
                .onConflictDoUpdate({
                  target: patientsStubTable.id,
                  set: {
                    name: data.name,
                    cpf: data.cpf,
                    phone: data.phone,
                    updatedAt: incomingUpdatedAt,
                  }
                });
            }
            success = true;
          }
        }
      } else if (latestRef.type === 'Fallback') {
        if (latestRef.entityName === 'Appointment') {
          const [apptRecord] = await dbMain
            .select()
            .from(appointmentsTable)
            .where(eq(appointmentsTable.id, latestRef.recordId));

          if (apptRecord) {
            await dbAnalytics
              .insert(appointmentsTable)
              .values({
                id: apptRecord.id,
                patientName: apptRecord.patientName,
                appointmentDate: apptRecord.appointmentDate,
                status: apptRecord.status,
                createdAt: apptRecord.createdAt,
              })
              .onConflictDoUpdate({
                target: appointmentsTable.id,
                set: {
                  patientName: apptRecord.patientName,
                  appointmentDate: apptRecord.appointmentDate,
                  status: apptRecord.status,
                },
              });
          }
          success = true;
        }
      }

      // 6. Clean up references if processing succeeded
      if (success) {
        for (const ref of sortedRefs) {
          if (ref.type === 'R2') {
            await env.SYNC_BUCKET.delete(ref.keyOrId);
          } else if (ref.type === 'Fallback') {
            await dbMain
              .delete(syncFallbacksTable)
              .where(eq(syncFallbacksTable.id, ref.keyOrId));
          }
        }
        synchronizedEntities++;
      }
    } catch (err) {
      console.error(`[Sync-Cron] Failed to process sync for group ${groupKey}:`, err);
    }
  }

  console.log(`[Sync-Cron] Synchronized ${synchronizedEntities} updates to D1_ANALYTICS.`);
}
