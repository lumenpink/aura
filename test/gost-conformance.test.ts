import { test, expect } from "bun:test";
import { existsSync } from "fs";
import { join } from "path";

test("gost v3 structure", () => {
    const root = join(import.meta.dir, "..");
    expect(existsSync(join(root, "GOSTVER"))).toBe(false);
    expect(existsSync(join(root, ".gost/GOST.md"))).toBe(true);
    expect(existsSync(join(root, ".gost/delivery.toml"))).toBe(true);
});
