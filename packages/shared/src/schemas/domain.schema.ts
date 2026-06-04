import { z } from "zod";

// Regular expression to validate standard domain name format (e.g. clinicaexemplo.com.br, api.domain.co)
// Allows alphanumeric characters, hyphens, and dots, ensuring proper structure and length.
const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((val) => domainRegex.test(val), {
    message: "Formato de domínio inválido (ex: api.clinica.com.br)",
  })
  .brand<"DomainName">();

export type DomainName = z.infer<typeof domainSchema>;

export const viteApiUrlSchema = z
  .string()
  .trim()
  .url({ message: "Formato de URL da API inválido (ex: https://api.clinica.com.br)" })
  .refine((val) => /^https?:\/\//i.test(val), {
    message: "A URL deve iniciar com http:// ou https://",
  })
  .brand<"ViteApiUrl">();

export type ViteApiUrl = z.infer<typeof viteApiUrlSchema>;

export const allowedOriginsSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return false;
      const origins = val.split(",").map((o) => o.trim());
      return origins.every((origin) => {
        try {
          const url = new URL(origin);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      });
    },
    {
      message: "Origens permitidas devem ser uma lista de URLs válidas separadas por vírgula (ex: https://app.clinica.com.br)",
    }
  )
  .brand<"AllowedOrigins">();

export type AllowedOrigins = z.infer<typeof allowedOriginsSchema>;

