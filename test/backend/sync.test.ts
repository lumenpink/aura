import { describe, expect, it, beforeEach } from "bun:test";
import { drizzle } from "drizzle-orm/d1";
import { DrizzleAppointmentRepository } from "../../apps/fluxo-backend/src/infrastructure/repositories/DrizzleAppointmentRepository";
import { Appointment } from "../../apps/fluxo-backend/src/domain/entities/Appointment";
import { syncR2ToAnalytics } from "../../apps/fluxo-backend/src/utils/sync";
import app from "../../apps/fluxo-backend/src/index";
import type { Bindings } from "../../apps/fluxo-backend/src/types";

// --- D1 MOCK CLASS ---
class MockD1Database {
  public rows: any[] = [];
  public runCalls: Array<{ sql: string; params: any[] }> = [];
  public forceFail = false;

  prepare(sql: string) {
    const run = async () => {
      if (this.forceFail) {
        throw new Error("Simulated D1 Failure");
      }
      const query = sql.replace(/\s+/g, " ").trim();
      const cleanQuery = query.replace(/[`"]/g, "").toLowerCase();
      this.runCalls.push({ sql: query, params: this.boundArgs });

      // Handle appointments inserts/upserts
      if (cleanQuery.includes("insert into appointments")) {
        const id = this.boundArgs[0];
        const patientName = this.boundArgs[1];
        const appointmentDate = this.boundArgs[2];
        const status = this.boundArgs[3];
        const createdAt = this.boundArgs[4];

        const existingIdx = this.rows.findIndex((r) => r.id === id);
        if (existingIdx !== -1) {
          this.rows[existingIdx] = { id, patientName, appointmentDate, status, createdAt };
        } else {
          this.rows.push({ id, patientName, appointmentDate, status, createdAt });
        }
      }

      // Handle sync_fallbacks inserts
      if (cleanQuery.includes("insert into sync_fallbacks")) {
        const id = this.boundArgs[0];
        const entityName = this.boundArgs[1];
        const recordId = this.boundArgs[2];
        const error = this.boundArgs[3];
        const createdAt = this.boundArgs[4];
        this.rows.push({ id, entityName, recordId, error, createdAt, isFallback: true });
      }

      // Handle delete queries
      if (cleanQuery.includes("delete from sync_fallbacks")) {
        const idToDelete = this.boundArgs[0];
        if (idToDelete) {
          this.rows = this.rows.filter((r) => r.id !== idToDelete);
        }
      }

      return { success: true };
    };

    const makeExecutor = (boundArgs: any[]) => {
      const executor = {
        run,
        first: async () => null,
        all: async () => {
          if (this.forceFail) {
            throw new Error("Simulated D1 Failure");
          }
          const query = sql.replace(/\s+/g, " ").trim();
          const cleanQuery = query.replace(/[`"]/g, "").toLowerCase();
          
          if (cleanQuery.includes("select")) {
            if (cleanQuery.includes("sync_fallbacks")) {
              const results = this.rows.filter((r) => r.isFallback === true);
              return { results };
            }
            if (cleanQuery.includes("appointments")) {
              // If there's a filter by ID
              if (cleanQuery.includes("where id =") || cleanQuery.includes("where appointments.id =")) {
                const idFilter = boundArgs[0];
                const results = this.rows.filter((r) => r.id === idFilter && !r.isFallback);
                return { results };
              }
              const results = this.rows.filter((r) => !r.isFallback);
              return { results };
            }
          }
          return { results: [] };
        },
        raw: async () => {
          const { results } = await executor.all();
          return results.map((row: any) => {
            if (row.isFallback) {
              return [row.id, row.entityName, row.recordId, row.error, row.createdAt];
            } else {
              return [row.id, row.patientName, row.appointmentDate, row.status, row.createdAt];
            }
          });
        },
        bind: (...args: any[]) => {
          this.boundArgs = args;
          return makeExecutor(args);
        },
      };
      return executor;
    };

    return makeExecutor([]);
  }
  
  private boundArgs: any[] = [];
}

// --- R2 MOCK CLASS ---
class MockR2Bucket {
  public store = new Map<string, string>();
  public putCalls = 0;
  public deleteCalls = 0;
  public forceFail = false;

  async put(key: string, value: string, options?: any) {
    if (this.forceFail) {
      throw new Error("Simulated R2 Failure");
    }
    this.putCalls++;
    this.store.set(key, value);
    return { key } as any;
  }

  async get(key: string) {
    const val = this.store.get(key);
    if (val === undefined) return null;
    return {
      json: async () => JSON.parse(val),
      text: async () => val,
    } as any;
  }

  async list(options?: { prefix?: string }) {
    const prefix = options?.prefix || "";
    const objects = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        objects.push({ key });
      }
    }
    return { objects } as any;
  }

  async delete(key: string) {
    this.deleteCalls++;
    this.store.delete(key);
  }
}

// --- KV MOCK CLASS ---
class MockKVNamespace {
  public store = new Map<string, string>();
  public putCalls = 0;
  public deleteCalls = 0;

  async put(key: string, value: string, options?: any) {
    this.putCalls++;
    this.store.set(key, value);
  }

  async get(key: string) {
    return this.store.get(key) || null;
  }

  async delete(key: string) {
    this.deleteCalls++;
    this.store.delete(key);
  }
}

describe("CQRS Eventual Consistency via R2 & Scheduled Cron", () => {
  let dbMain: MockD1Database;
  let dbAnalytics: MockD1Database;
  let r2Bucket: MockR2Bucket;
  let kvNamespace: MockKVNamespace;
  let env: Bindings;

  beforeEach(() => {
    dbMain = new MockD1Database();
    dbAnalytics = new MockD1Database();
    r2Bucket = new MockR2Bucket();
    kvNamespace = new MockKVNamespace();

    env = {
      D1_MAIN: dbMain as any,
      D1_ANALYTICS: dbAnalytics as any,
      SYNC_BUCKET: r2Bucket as any,
      REVOCATION_KV: kvNamespace as any,
      API_DOMAIN: "api.clinicaexemplo.com.br" as any,
    };
  });

  it("should write to D1_MAIN and save sync payload to R2 queue", async () => {
    const drizzleDbMain = drizzle(dbMain as any);
    const repo = new DrizzleAppointmentRepository(drizzleDbMain, r2Bucket as any);

    const appt = new Appointment(
      "appt-123",
      "John Doe",
      new Date("2026-06-10T10:00:00Z"),
      "PENDING",
      new Date("2026-06-04T12:00:00Z")
    );

    await repo.save(appt);

    // Verify written to D1_MAIN
    expect(dbMain.rows.length).toBe(1);
    expect(dbMain.rows[0].id).toBe("appt-123");
    expect(dbMain.rows[0].patientName).toBe("John Doe");

    // Verify written to R2 queue
    expect(r2Bucket.putCalls).toBe(1);
    expect(r2Bucket.store.size).toBe(1);

    const keys = Array.from(r2Bucket.store.keys());
    expect(keys[0]).toStartWith("queue/appointment_appt-123_");

    const payload = JSON.parse(r2Bucket.store.get(keys[0]!)!);
    expect(payload.entityName).toBe("Appointment");
    expect(payload.data.id).toBe("appt-123");
    expect(payload.data.patientName).toBe("John Doe");
  });

  it("should synchronize R2 queue payloads to D1_ANALYTICS and clean R2", async () => {
    // 1. Pre-seed a replication payload in R2 queue
    const eventPayload = {
      entityName: "Appointment",
      action: "upsert",
      data: {
        id: "appt-999",
        patientName: "Alice Smith",
        appointmentDate: "2026-06-12T14:30:00Z",
        status: "CONFIRMED",
        createdAt: "2026-06-04T15:00:00Z",
      },
      timestamp: new Date().toISOString(),
    };
    await r2Bucket.put("queue/appointment_appt-999_12345.json", JSON.stringify(eventPayload));

    // 2. Trigger sync
    await syncR2ToAnalytics(env);

    // Verify D1_ANALYTICS received the record
    expect(dbAnalytics.rows.length).toBe(1);
    expect(dbAnalytics.rows[0].id).toBe("appt-999");
    expect(dbAnalytics.rows[0].patientName).toBe("Alice Smith");
    expect(dbAnalytics.rows[0].status).toBe("CONFIRMED");

    // Verify R2 queue has been deleted
    expect(r2Bucket.store.size).toBe(0);
    expect(r2Bucket.deleteCalls).toBe(1);
  });

  it("should abort sync if another instance is already running (KV lock active)", async () => {
    // 1. Put lock key in KV
    await kvNamespace.put("lock:sync_analytics", "true");

    // 2. Seed payload in R2
    const eventPayload = {
      entityName: "Appointment",
      action: "upsert",
      data: {
        id: "appt-locked",
        patientName: "Locked User",
        appointmentDate: "2026-06-15T09:00:00Z",
        status: "PENDING",
        createdAt: "2026-06-04T12:00:00Z",
      },
      timestamp: new Date().toISOString(),
    };
    await r2Bucket.put("queue/appointment_appt-locked_12345.json", JSON.stringify(eventPayload));

    // 3. Trigger scheduled Cron handler via Worker export
    const cronEvent = {};
    const ctx = {};
    await app.scheduled!(cronEvent, env, ctx);

    // Verify that sync did NOT run: D1_ANALYTICS has no rows, R2 file not deleted
    expect(dbAnalytics.rows.length).toBe(0);
    expect(r2Bucket.store.size).toBe(1);

    // 4. Remove lock from KV, and try again
    await kvNamespace.delete("lock:sync_analytics");
    await app.scheduled!(cronEvent, env, ctx);

    // Verify that sync successfully executed now
    expect(dbAnalytics.rows.length).toBe(1);
    expect(dbAnalytics.rows[0].id).toBe("appt-locked");
    expect(r2Bucket.store.size).toBe(0);
  });

  it("should fail gracefully and write to sync_fallbacks table if R2 put fails", async () => {
    const drizzleDbMain = drizzle(dbMain as any);
    const repo = new DrizzleAppointmentRepository(drizzleDbMain, r2Bucket as any);

    // Force R2 failure
    r2Bucket.forceFail = true;

    const appt = new Appointment(
      "appt-fail",
      "Broken R2",
      new Date("2026-06-10T10:00:00Z"),
      "PENDING",
      new Date("2026-06-04T12:00:00Z")
    );

    await repo.save(appt);

    // Verify written to D1_MAIN
    const apptInMain = dbMain.rows.find((r) => r.id === "appt-fail");
    expect(apptInMain).toBeDefined();

    // Verify R2 failure logged to sync_fallbacks table in D1_MAIN
    const fallbackLog = dbMain.rows.find((r) => r.isFallback === true);
    expect(fallbackLog).toBeDefined();
    expect(fallbackLog.recordId).toBe("appt-fail");
    expect(fallbackLog.error).toInclude("R2 Write Failure");
  });

  it("should keep payload in R2 if analytics database write fails during scheduled sync", async () => {
    // Seed R2 queue
    const eventPayload = {
      entityName: "Appointment",
      action: "upsert",
      data: {
        id: "appt-d1-fail",
        patientName: "Failed D1 Analytics",
        appointmentDate: "2026-06-15T09:00:00Z",
        status: "PENDING",
        createdAt: "2026-06-04T12:00:00Z",
      },
      timestamp: new Date().toISOString(),
    };
    await r2Bucket.put("queue/appointment_appt-d1-fail_12345.json", JSON.stringify(eventPayload));

    // Force D1_ANALYTICS failure
    dbAnalytics.forceFail = true;

    // Trigger sync
    await syncR2ToAnalytics(env);

    // Verify R2 file is NOT deleted (size is still 1) and delete was NOT called
    expect(r2Bucket.store.size).toBe(1);
    expect(r2Bucket.deleteCalls).toBe(0);
  });

  it("should reconcile sync_fallbacks records to D1_ANALYTICS and delete them from D1_MAIN", async () => {
    // 1. Seed operational record in D1_MAIN
    const apptDate = new Date("2026-06-10T10:00:00Z");
    const createDate = new Date("2026-06-04T12:00:00Z");
    dbMain.rows.push({
      id: "appt-fallback-reconcile",
      patientName: "Fallback Reconciled Patient",
      appointmentDate: apptDate,
      status: "CONFIRMED",
      createdAt: createDate,
    });

    // 2. Seed fallback record in D1_MAIN sync_fallbacks
    const fallbackId = "fallback-log-123";
    dbMain.rows.push({
      id: fallbackId,
      entityName: "Appointment",
      recordId: "appt-fallback-reconcile",
      error: "R2 Write Failure: Simulated failure",
      createdAt: createDate,
      isFallback: true,
    });

    // 3. Trigger sync (which handles fallbacks first)
    await syncR2ToAnalytics(env);

    // 4. Verify record was reconciled to D1_ANALYTICS
    const reconciled = dbAnalytics.rows.find(r => r.id === "appt-fallback-reconcile");
    expect(reconciled).toBeDefined();
    expect(reconciled.patientName).toBe("Fallback Reconciled Patient");
    expect(reconciled.status).toBe("CONFIRMED");

    // 5. Verify fallback log was deleted from D1_MAIN sync_fallbacks
    const fallbackLogExists = dbMain.rows.some((r) => r.id === fallbackId && r.isFallback === true);
    expect(fallbackLogExists).toBe(false);
  });

  it("should handle Scenario 1: fallback at T1 (10h), R2 at T2 (9h) -> final state is 9h (R2)", async () => {
    // T1: 10h fallback
    const t1 = new Date("2026-06-04T12:00:00Z");
    const date10h = new Date("2026-06-10T10:00:00Z");
    
    // Seed fallback log representing state at T1 (10h)
    dbMain.rows.push({
      id: "fallback-t1",
      entityName: "Appointment",
      recordId: "appt-scen-1",
      error: "R2 Write Failure: Simulated failure at T1",
      createdAt: t1,
      isFallback: true,
    });

    // T2: 9h in R2
    const t2 = new Date("2026-06-04T12:05:00Z");
    const date9h = new Date("2026-06-10T09:00:00Z");
    const eventPayload = {
      entityName: "Appointment",
      action: "upsert",
      data: {
        id: "appt-scen-1",
        patientName: "Patient Scenario 1",
        appointmentDate: date9h.toISOString(),
        status: "CONFIRMED",
        createdAt: t1.toISOString(),
      },
      timestamp: t2.toISOString(),
    };
    await r2Bucket.put(`queue/appointment_appt-scen-1_${t2.getTime()}.json`, JSON.stringify(eventPayload));

    // Also seed D1_MAIN with the final state at T2 (9h)
    dbMain.rows.push({
      id: "appt-scen-1",
      patientName: "Patient Scenario 1",
      appointmentDate: date9h,
      status: "CONFIRMED",
      createdAt: t1,
    });

    // Trigger sync
    await syncR2ToAnalytics(env);

    // Verify analytics contains 9h (latest R2 state)
    const reconciled = dbAnalytics.rows.find(r => r.id === "appt-scen-1");
    expect(reconciled).toBeDefined();
    expect(new Date(reconciled.appointmentDate)).toEqual(date9h);

    // Verify cleanup of both sources
    expect(r2Bucket.store.size).toBe(0);
    const fallbackExists = dbMain.rows.some(r => r.id === "fallback-t1" && r.isFallback === true);
    expect(fallbackExists).toBe(false);
  });

  it("should handle Scenario 2: R2 at T1 (9h), fallback at T2 (10h) -> final state is 10h (D1_MAIN)", async () => {
    // T1: 9h in R2
    const t1 = new Date("2026-06-04T12:00:00Z");
    const date9h = new Date("2026-06-10T09:00:00Z");
    const eventPayload = {
      entityName: "Appointment",
      action: "upsert",
      data: {
        id: "appt-scen-2",
        patientName: "Patient Scenario 2",
        appointmentDate: date9h.toISOString(),
        status: "CONFIRMED",
        createdAt: t1.toISOString(),
      },
      timestamp: t1.toISOString(),
    };
    await r2Bucket.put(`queue/appointment_appt-scen-2_${t1.getTime()}.json`, JSON.stringify(eventPayload));

    // T2: 10h fallback
    const t2 = new Date("2026-06-04T12:05:00Z");
    const date10h = new Date("2026-06-10T10:00:00Z");
    
    // Seed fallback log representing state at T2 (10h)
    dbMain.rows.push({
      id: "fallback-t2",
      entityName: "Appointment",
      recordId: "appt-scen-2",
      error: "R2 Write Failure: Simulated failure at T2",
      createdAt: t2,
      isFallback: true,
    });

    // Seed D1_MAIN with final state at T2 (10h)
    dbMain.rows.push({
      id: "appt-scen-2",
      patientName: "Patient Scenario 2",
      appointmentDate: date10h,
      status: "CONFIRMED",
      createdAt: t1,
    });

    // Trigger sync
    await syncR2ToAnalytics(env);

    // Verify analytics contains 10h (latest state from D1_MAIN)
    const reconciled = dbAnalytics.rows.find(r => r.id === "appt-scen-2");
    expect(reconciled).toBeDefined();
    expect(new Date(reconciled.appointmentDate)).toEqual(date10h);

    // Verify cleanup of both sources
    expect(r2Bucket.store.size).toBe(0);
    const fallbackExists = dbMain.rows.some(r => r.id === "fallback-t2" && r.isFallback === true);
    expect(fallbackExists).toBe(false);
  });
});
