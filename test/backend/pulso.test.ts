import { describe, expect, it, beforeEach } from "bun:test";
import app from "../../apps/pulso-backend/src/index";
import { sign } from "hono/jwt";

class MockD1Database {
  public prescriptions: any[] = [];
  public items: any[] = [];
  public logs: any[] = [];

  prepare(sql: string) {
    const query = sql.replace(/\s+/g, " ").trim();

    const makeExecutor = (boundArgs: any[]) => {
      const run = async () => {
        // 1. OCC Conditional INSERT into prescriptions
        if (query.includes("INSERT INTO prescriptions")) {
          const [
            id, tenantId, patientCpf, patientName, patientBirthdate,
            doctorCpf, doctorName, doctorCrm, doctorCrmUf,
            type, status, createdAt, expiresAt,
            payloadHash, previousHash, currentHash,
            // check bindings:
            chkTenantId, chkPreviousHash, chkTenantId2
          ] = boundArgs;

          const tenantPrescriptions = this.prescriptions.filter(p => p.tenant_id === tenantId);
          let latestHash = '0';
          if (tenantPrescriptions.length > 0) {
            tenantPrescriptions.sort((a, b) => b.created_at - a.created_at);
            latestHash = tenantPrescriptions[0].current_hash;
          }

          if (latestHash !== previousHash) {
            return { meta: { changes: 0 }, changes: 0, success: true };
          }

          const newRecord = {
            id,
            tenant_id: tenantId,
            patient_cpf: patientCpf,
            patient_name: patientName,
            patient_birthdate: patientBirthdate,
            doctor_cpf: doctorCpf,
            doctor_name: doctorName,
            doctor_crm: doctorCrm,
            doctor_crm_uf: doctorCrmUf,
            type,
            status,
            created_at: createdAt,
            expires_at: expiresAt,
            payload_hash: payloadHash,
            previous_hash: previousHash,
            current_hash: currentHash
          };
          this.prescriptions.push(newRecord);
          return { meta: { changes: 1 }, changes: 1, success: true };
        }

        // 2. Drizzle INSERT items
        if (query.includes("insert into \"prescription_items\"") || query.includes("insert into `prescription_items`")) {
          const [id, prescriptionId, medicationName, dosageForm, concentration, quantity, instructions, createdAt] = boundArgs;
          this.items.push({
            id,
            prescription_id: prescriptionId,
            medication_name: medicationName,
            dosage_form: dosageForm,
            concentration,
            quantity,
            instructions,
            created_at: createdAt
          });
          return { success: true };
        }

        // 3. Drizzle UPDATE prescription for sign/dispense
        if (query.includes("update \"prescriptions\"") || query.includes("update `prescriptions`")) {
          const status = boundArgs[0];
          const signatureOrNotes = boundArgs[1];
          const signedAtOrCreatedAt = boundArgs[2];
          const id = boundArgs[3];

          const record = this.prescriptions.find(p => p.id === id);
          if (record) {
            record.status = status;
            record.digital_signature = signatureOrNotes;
            record.signed_at = signedAtOrCreatedAt;
          }
          return { success: true };
        }

        // 4. Drizzle INSERT validity logs
        if (query.includes("insert into \"prescription_validity_logs\"") || query.includes("insert into `prescription_validity_logs`")) {
          const [id, prescriptionId, action, performedBy, notes, createdAt] = boundArgs;
          this.logs.push({
            id,
            prescription_id: prescriptionId,
            action,
            performed_by: performedBy,
            notes,
            created_at: createdAt
          });
          return { success: true };
        }

        return { success: true };
      };

      const all = async () => {
        // SELECT for prescriptions list
        if (query.includes("select") && query.includes("prescriptions")) {
          // If filtering by ID, simulate single fetch query
          if (query.includes("where \"prescriptions\".\"id\" = ?") || query.includes("where prescriptions.id = ?")) {
            const id = boundArgs[0];
            const p = this.prescriptions.find(r => r.id === id);
            return p ? { results: [p] } : { results: [] };
          }

          // Otherwise return all matching tenantId
          const tenantId = boundArgs[0];
          let list = this.prescriptions;
          if (tenantId) {
            list = list.filter(p => p.tenant_id === tenantId);
          }
          list.sort((a, b) => b.created_at - a.created_at);
          return { results: list };
        }

        // SELECT for items
        if (query.includes("select") && query.includes("prescription_items")) {
          const prescriptionId = boundArgs[0];
          const list = this.items.filter(i => i.prescription_id === prescriptionId);
          return { results: list };
        }

        return { results: [] };
      };

      const raw = async () => {
        const { results } = await all();
        const mapped = results.map((row: any) => {
          if ('medication_name' in row || 'medicationName' in row) {
            return [
              row.id,
              row.prescription_id,
              row.medication_name,
              row.dosage_form,
              row.concentration,
              row.quantity,
              row.instructions,
              row.created_at
            ];
          } else {
            return [
              row.id,
              row.tenant_id,
              row.patient_cpf,
              row.patient_name,
              row.patient_birthdate,
              row.doctor_cpf,
              row.doctor_name,
              row.doctor_crm,
              row.doctor_crm_uf,
              row.type,
              row.status,
              row.created_at,
              row.expires_at,
              row.digital_signature,
              row.signed_at,
              row.payload_hash,
              row.previous_hash,
              row.current_hash
            ];
          }
        });
        return mapped;
      };
      const first = async () => {
        const results = await all();
        return results.results[0] || null;
      };

      return {
        run,
        all,
        first,
        raw
      };
    };

    return {
      bind: (...args: any[]) => makeExecutor(args)
    };
  }
}

describe("Aura Pulso Backend Integration", () => {
  let dbMain: MockD1Database;
  let mockToken: string;

  beforeEach(async () => {
    dbMain = new MockD1Database();

    // Create a mock token
    const payload = {
      sub: "12345678909",
      doctor_cpf: "12345678909",
      doctor_name: "Dr. Fernando Henrique",
      doctor_crm: "123456",
      doctor_crm_uf: "SP",
      tenant_id: "clinica-luz",
      role: "MEDICO",
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    mockToken = `header.${btoa(JSON.stringify(payload))}.signature`;
  });

  it("should return the public JWKS without requiring authorization", async () => {
    const res = await app.request("/auth/jwks", {
      method: "GET"
    }, {
      D1_MAIN: dbMain as any
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.keys).toBeDefined();
    expect(data.keys[0].kid).toBe("pulso-key-active-01");
  });

  it("should create a draft prescription and update the ledger chain", async () => {
    const payloadBody = {
      id: "recipe-1",
      patientCpf: "000.111.222-33",
      patientName: "John Doe",
      patientBirthdate: "1985-05-15",
      type: "comum",
      items: [
        {
          medicationName: "Amoxicilina",
          concentration: "500mg",
          dosageForm: "comprimido",
          quantity: "2 caixas",
          instructions: "Tomar de 8 em 8 horas por 7 dias"
        }
      ]
    };

    const res = await app.request("/api/prescriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mockToken}`
      },
      body: JSON.stringify(payloadBody)
    }, {
      D1_MAIN: dbMain as any
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("success");
    expect(body.data.id).toBe("recipe-1");
    expect(body.data.previousHash).toBe("0");
    expect(body.data.currentHash).toHaveLength(64);

    // Verify written in MockD1
    expect(dbMain.prescriptions).toHaveLength(1);
    expect(dbMain.items).toHaveLength(1);
    expect(dbMain.items[0].medication_name).toBe("Amoxicilina");
  });

  it("should enforce ledger chaining when creating multiple prescriptions (previousHash matches currentHash)", async () => {
    // 1. First prescription
    const res1 = await app.request("/api/prescriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mockToken}`
      },
      body: JSON.stringify({
        id: "recipe-1",
        patientCpf: "000.111.222-33",
        patientName: "Patient One",
        items: [{ medicationName: "Aspirina" }]
      })
    }, {
      D1_MAIN: dbMain as any
    });

    const body1 = await res1.json();
    const hash1 = body1.data.currentHash;

    // 2. Second prescription
    const res2 = await app.request("/api/prescriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mockToken}`
      },
      body: JSON.stringify({
        id: "recipe-2",
        patientCpf: "000.111.222-44",
        patientName: "Patient Two",
        items: [{ medicationName: "Ibuprofeno" }]
      })
    }, {
      D1_MAIN: dbMain as any
    });

    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.data.previousHash).toBe(hash1); // Correct chaining!
  });

  it("should fail validation with 409 Conflict if OCC check fails (hash mismatch)", async () => {
    // Inject a dummy prescription to trigger hash mismatch if we don't chain correctly
    dbMain.prescriptions.push({
      id: "obsolete-recipe",
      tenant_id: "clinica-luz",
      current_hash: "incorrect-outdated-hash",
      created_at: Date.now() - 10000
    });

    // We will attempt to insert with previousHash = "0", but the latest hash is "incorrect-outdated-hash".
    // This will cause changes = 0 inside the prepare run OCC.
    const res = await app.request("/api/prescriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mockToken}`
      },
      body: JSON.stringify({
        id: "recipe-fail",
        patientCpf: "000.111.222-33",
        patientName: "John Doe",
        previousHash: "0",
        items: [{ medicationName: "Paracetamol" }]
      })
    }, {
      D1_MAIN: dbMain as any
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("JQ490_CONCURRENCY_CONFLICT");
  });

  it("should sign the prescription draft successfully", async () => {
    // 1. Seed a draft prescription
    dbMain.prescriptions.push({
      id: "recipe-sign-target",
      tenant_id: "clinica-luz",
      status: "rascunho",
      current_hash: "some-hash",
      created_at: Date.now()
    });

    // 2. Submit signature
    const signature = "MOCK_PKCS7_SIGNATURE_DATA_STRING";
    const res = await app.request("/api/prescriptions/recipe-sign-target/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mockToken}`
      },
      body: JSON.stringify({ signature })
    }, {
      D1_MAIN: dbMain as any
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("success");
    expect(dbMain.prescriptions[0].status).toBe("ativa");
    expect(dbMain.prescriptions[0].digital_signature).toBe(signature);
  });

  it("should allow public PDF generation for prescriptions", async () => {
    // Seed an active prescription with items
    dbMain.prescriptions.push({
      id: "recipe-pdf-target",
      tenant_id: "clinica-luz",
      status: "ativa",
      patient_name: "Jane Doe",
      patient_cpf: "123.456.789-00",
      doctor_name: "Dr. Fernando Henrique",
      doctor_crm: "123456",
      doctor_crm_uf: "SP",
      current_hash: "hash-pdf",
      created_at: Date.now()
    });
    dbMain.items.push({
      prescription_id: "recipe-pdf-target",
      medication_name: "Ritalina",
      concentration: "10mg",
      quantity: "1 caixa"
    });

    const res = await app.request("/api/prescriptions/recipe-pdf-target/pdf", {
      method: "GET"
      // NO Authorization Header -> Public download route
    }, {
      D1_MAIN: dbMain as any
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    const pdfBytes = await res.arrayBuffer();
    expect(pdfBytes.byteLength).toBeGreaterThan(0);
  });
});
