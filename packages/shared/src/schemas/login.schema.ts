import { z } from "zod";
import { cpfSchema } from "./cpf.schema";

export const loginSchema = z.object({
    username: cpfSchema,
    password: z.string().min(6, "Senha muito curta"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;