import test from "node:test";
import assert from "node:assert/strict";
import { normalizePaymentStatus } from "../src/payments/PaymentStatus.ts";

test("normalizes successful provider status", () => {
  assert.equal(normalizePaymentStatus("succeeded"), "paid");
});

test("normalizes an action-required provider status as processing", () => {
  assert.equal(normalizePaymentStatus("requires_action"), "processing");
});

test("normalizes a declined provider status", () => {
  assert.equal(normalizePaymentStatus("declined"), "failed");
});

test("treats unknown provider statuses as unresolved processing", () => {
  assert.equal(normalizePaymentStatus("new_provider_state"), "processing");
});
