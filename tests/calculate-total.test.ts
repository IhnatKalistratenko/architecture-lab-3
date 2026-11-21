import test from "node:test";
import assert from "node:assert/strict";
import { calculateTotal, type CartLine } from "../src/shared/calculateTotal.ts";

test("calculateTotal is deterministic from its arguments", () => {
  const lines: CartLine[] = [
    { productId: "book", unitPrice: 100, quantity: 2 },
    { productId: "pen", unitPrice: 10, quantity: 1 },
  ];

  assert.equal(calculateTotal(lines, 10, 0.2), 226.8);
  assert.equal(calculateTotal(lines, 10, 0.2), 226.8);
  assert.equal(calculateTotal(lines, 0, 0.2), 252);
});

test("calculateTotal does not mutate its input lines", () => {
  const lines: CartLine[] = [
    { productId: "book", unitPrice: 100, quantity: 2 },
    { productId: "pen", unitPrice: 10, quantity: 1 },
  ];
  const before = structuredClone(lines);

  calculateTotal(lines, 10, 0.2);

  assert.deepEqual(lines, before);
});
