import test from "node:test";
import assert from "node:assert/strict";
import {
  PaymentsService,
  type PaymentProviderName,
  type PaymentsPort,
} from "../src/payments/PaymentService.ts";

const request = {
  provider: "stripe" as PaymentProviderName,
  paymentToken: "token",
  amount: 1250,
  currency: "UAH",
  orderId: "order-test",
};

async function charge(provider: PaymentProviderName, paymentToken: string) {
  const body = { ...request, provider, paymentToken };
  const payments: PaymentsPort = new PaymentsService();
  return payments.charge(body);
}

for (const provider of ["stripe", "acme"] as const) {
  test(`${provider} adapter maps its success status to paid`, async () => {
    assert.equal(await charge(provider, "valid_token"), "paid");
  });

  test(`${provider} adapter maps its in-progress status to processing`, async () => {
    const token = provider === "stripe" ? "action_token" : "review_token";
    assert.equal(await charge(provider, token), "processing");
  });

  test(`${provider} adapter maps its rejection status to failed`, async () => {
    assert.equal(await charge(provider, "fail_token"), "failed");
  });

  test(`${provider} adapter treats an unknown status as processing`, async () => {
    assert.equal(await charge(provider, "unknown_token"), "processing");
  });
}
