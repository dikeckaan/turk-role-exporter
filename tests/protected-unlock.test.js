import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

describe("protected group membership", () => {
  const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
  it("airband, marine, pmr, dpmr groups all have protected-group class", () => {
    for (const id of ["opsiyon-airband-group", "opsiyon-marine-group", "opsiyon-pmr-group", "opsiyon-dpmr-group"]) {
      const reIdFirst = new RegExp(`id="${id}"[^>]*class="[^"]*protected-group`);
      const reClassFirst = new RegExp(`class="[^"]*protected-group[^"]*"[^>]*id="${id}"`);
      assert.ok(
        reIdFirst.test(html) || reClassFirst.test(html),
        `${id} missing protected-group class`,
      );
    }
  });
});

describe("auth-modal unlock coverage", () => {
  it("korunanlariGuncelle references all four groups", () => {
    const src = readFileSync(new URL("../docs/js/auth-modal.js", import.meta.url), "utf8");
    for (const id of ["opsiyon-airband-group", "opsiyon-marine-group", "opsiyon-pmr-group", "opsiyon-dpmr-group"]) {
      assert.ok(src.includes(id), `auth-modal.js missing reference to ${id}`);
    }
  });
});
