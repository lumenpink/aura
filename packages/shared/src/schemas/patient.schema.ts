import { z } from "zod";

export const insertPatientSchema = z.object({
  name: z.string().min(3, "O nome deve ter no mínimo 3 letras"),
  cpf: z.string().length(11, "CPF deve conter exatamente 11 dígitos numéricos"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato deve ser AAAA-MM-DD")
});

export type InsertPatient = z.infer<typeof insertPatientSchema>;
