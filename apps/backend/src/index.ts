import { Hono } from "hono";
import { validator } from "hono/validator";
import { insertPatientSchema } from "@aura/shared";

const app = new Hono();

const routes = app.post(
  "/api/patients",
  validator("json", (value, c) => {
    const parsed = insertPatientSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: parsed.error.format() }, 400);
    }
    return parsed.data;
  }),
  (c) => {
    const patientData = c.req.valid("json");
    return c.json({ success: true, data: patientData });
  }
);

export type AppType = typeof routes;
export default app;
