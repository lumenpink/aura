import { z } from "zod";

export const refreshCookieSchema = z.object({
    refreshToken: z.string({
        required_error: "Refresh token is required",
    }).min(1, "Refresh token cannot be empty"),
});

export type RefreshCookie = z.infer<typeof refreshCookieSchema>;
