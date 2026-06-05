import { describe, expect, it } from "bun:test";
import { cpfSchema } from "@aura/shared";

describe("cpfSchema", () => {
    it("should validate a correct CPF without formatting", () => {
        const result = cpfSchema.safeParse("12345678909");
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe("12345678909");
        }
    });

    it("should validate a correct CPF with formatting", () => {
        const result = cpfSchema.safeParse("123.456.789-09");
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe("12345678909"); // should be transformed/cleaned
        }
    });

    it("should validate another correct CPF", () => {
        const result = cpfSchema.safeParse("987.654.321-00");
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe("98765432100");
        }
    });

    it("should fail validation for a CPF with all identical digits", () => {
        const result = cpfSchema.safeParse("111.111.111-11");
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.message).toBe("CPF inválido");
        }
    });

    it("should fail validation for an invalid CPF format/length", () => {
        const result = cpfSchema.safeParse("123.456.789");
        expect(result.success).toBe(false);
    });

    it("should fail validation for a CPF with wrong check digits", () => {
        const result = cpfSchema.safeParse("123.456.789-00"); // 12345678900 instead of 12345678909
        expect(result.success).toBe(false);
    });

    it("should fail validation for an empty string", () => {
        const result = cpfSchema.safeParse("");
        expect(result.success).toBe(false);
    });
});
