import { describe, expect, it } from "bun:test";
import { domainSchema, viteApiUrlSchema, allowedOriginsSchema } from "../../packages/shared/src/schemas/domain.schema";

describe("domainSchema", () => {
  it("should validate a correct simple domain", () => {
    const res = domainSchema.safeParse("clinicaexemplo.com.br");
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data as string).toBe("clinicaexemplo.com.br");
    }
  });

  it("should validate a correct subdomain", () => {
    const res = domainSchema.safeParse("api.clinicaexemplo.com.br");
    expect(res.success).toBe(true);
  });

  it("should validate local dev domain", () => {
    const res = domainSchema.safeParse("api-aura.2lp.in");
    expect(res.success).toBe(true);
  });

  it("should reject domain with protocol", () => {
    const res = domainSchema.safeParse("https://api.clinicaexemplo.com.br");
    expect(res.success).toBe(false);
  });

  it("should reject domain with path", () => {
    const res = domainSchema.safeParse("clinicaexemplo.com.br/auth");
    expect(res.success).toBe(false);
  });

  it("should reject domain with invalid characters", () => {
    const res = domainSchema.safeParse("api_domain.com");
    expect(res.success).toBe(false);
  });

  it("should reject empty string", () => {
    const res = domainSchema.safeParse("");
    expect(res.success).toBe(false);
  });
});

describe("viteApiUrlSchema", () => {
  it("should validate a correct API URL with https", () => {
    const res = viteApiUrlSchema.safeParse("https://api.clinicaexemplo.com.br");
    expect(res.success).toBe(true);
  });

  it("should validate a correct API URL with http and port", () => {
    const res = viteApiUrlSchema.safeParse("http://localhost:12202");
    expect(res.success).toBe(true);
  });

  it("should reject API URL without protocol", () => {
    const res = viteApiUrlSchema.safeParse("api.clinicaexemplo.com.br");
    expect(res.success).toBe(false);
  });

  it("should reject API URL with invalid protocol", () => {
    const res = viteApiUrlSchema.safeParse("ftp://api.clinicaexemplo.com.br");
    expect(res.success).toBe(false);
  });
});

describe("allowedOriginsSchema", () => {
  it("should validate a single origin URL", () => {
    const res = allowedOriginsSchema.safeParse("https://app.clinicaexemplo.com.br");
    expect(res.success).toBe(true);
  });

  it("should validate multiple comma-separated origin URLs", () => {
    const res = allowedOriginsSchema.safeParse("https://app.clinicaexemplo.com.br,http://localhost:12201");
    expect(res.success).toBe(true);
  });

  it("should validate multiple comma-separated origin URLs with whitespace", () => {
    const res = allowedOriginsSchema.safeParse("https://app.clinicaexemplo.com.br, http://localhost:12201 ");
    expect(res.success).toBe(true);
  });

  it("should reject empty origin string", () => {
    const res = allowedOriginsSchema.safeParse("");
    expect(res.success).toBe(false);
  });

  it("should reject invalid URLs in the list", () => {
    const res = allowedOriginsSchema.safeParse("https://app.clinicaexemplo.com.br,invalid-url");
    expect(res.success).toBe(false);
  });
});

