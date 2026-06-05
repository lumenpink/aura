import { describe, expect, it } from "bun:test";
import { loginSchema } from "@aura/shared";

describe("loginSchema", () => {
    it("should validate correct credentials", () => {
        const credentials = {
            username: "123.456.789-09",
            password: "supersecurepassword123",
        };
        const result = loginSchema.safeParse(credentials);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.username).toBe("12345678909"); // transformed CPF
            expect(result.data.password).toBe("supersecurepassword123");
        }
    });

    it("should fail validation if password is too short", () => {
        const credentials = {
            username: "123.456.789-09",
            password: "12345", // less than 6 chars
        };
        const result = loginSchema.safeParse(credentials);
        expect(result.success).toBe(false);
        if (!result.success) {
            const passwordError = result.error.issues.find(e => e.path.includes("password"));
            expect(passwordError?.message).toBe("Senha muito curta");
        }
    });

    it("should fail validation if username is an invalid CPF", () => {
        const credentials = {
            username: "123.456.789-00", // invalid check digit
            password: "supersecurepassword123",
        };
        const result = loginSchema.safeParse(credentials);
        expect(result.success).toBe(false);
        if (!result.success) {
            const usernameError = result.error.issues.find(e => e.path.includes("username"));
            expect(usernameError?.message).toBe("CPF inválido");
        }
    });

    it("should fail validation for empty object/fields", () => {
        const result = loginSchema.safeParse({
            username: "",
            password: "",
        });
        expect(result.success).toBe(false);
    });
});
