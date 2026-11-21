import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkArchitecture } from "../scripts/check-architecture.mjs";

function fixture(files: Record<string, string>, run: (root: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-check-"));
  try {
    for (const [relativePath, contents] of Object.entries(files)) {
      const file = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, contents);
    }
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("architecture check passes when the fixture has no violations", () => {
  fixture({ "src/orders/OrderService.ts": "export const ready = true;\n" }, (root) => {
    assert.deepEqual(checkArchitecture(root), []);
  });
});

test("architecture check finds cross-module internal imports", () => {
  fixture({
    "src/orders/OrderService.ts": 'import { StripeClient } from "../payments/internal/StripeClient.ts";\n',
    "src/payments/internal/StripeClient.ts": "export class StripeClient {}\n",
  }, (root) => {
    assert.match(checkArchitecture(root).join("\n"), /imports internal file/);
  });
});

test("architecture check finds direct Orders writes to Inventory storage", () => {
  fixture({
    "src/orders/OrderService.ts": 'database.stock.get("book").available--;\n',
    "src/checkout/CheckoutController.ts": "const stock = database.stock; stock.set(productId, row);\n",
    "src/checkout/LegacyCheckout.ts": 'const stock = database.stock; stock.get("book").available--;\n',
  }, (root) => {
    const violations = checkArchitecture(root).join("\n");
    assert.match(violations, /src\/orders\/OrderService\.ts:1 writes Inventory storage directly/);
    assert.match(violations, /src\/checkout\/CheckoutController\.ts:1 writes Inventory storage directly/);
    assert.match(violations, /src\/checkout\/LegacyCheckout\.ts:1 writes Inventory storage directly/);
  });
});

test("architecture check allows reads from Inventory storage", () => {
  fixture({
    "src/orders/OrderService.ts": 'const stock = database.stock; const book = stock.get("book");\n',
  }, (root) => {
    assert.deepEqual(checkArchitecture(root), []);
  });
});

test("architecture check finds cycles in the discovered local import graph", () => {
  fixture({
    "src/orders/OrderService.ts": 'import "../payments/PaymentService.ts";\n',
    "src/payments/PaymentService.ts": 'import "../orders/OrderService.ts";\n',
  }, (root) => {
    assert.match(checkArchitecture(root).join("\n"), /Local import dependency cycle/);
  });
});
