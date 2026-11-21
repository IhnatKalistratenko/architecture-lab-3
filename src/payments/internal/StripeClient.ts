import type { PaymentRequest } from "../PaymentContracts.ts";
import type { PaymentStatus } from "../PaymentStatus.ts";
import type { ProviderInterface } from "./ProviderInterface.ts";

type StripePayload = {
  id: string;
  amount: number;
  currency: string;
  metadata: { orderId: string };
};

export type StripeResponse = {
  charge_id: string;
  state: string;
};

export class StripeClient implements ProviderInterface {
  normalizePaymentStatus(response: StripeResponse): PaymentStatus {
  switch (response.state) {
    case "succeeded":
      return "paid";
    case "requires_action":
      return "processing";
    case "declined":
      return "failed";
    default:

      return "processing";
  }
}
  async charge(payload: PaymentRequest): Promise<PaymentStatus> {
    const stripePayload: StripePayload = {
      id: payload.paymentToken,
      amount: payload.amount,
      currency: payload.currency,
      metadata: {orderId: payload.orderId}
    };


    const state = stripePayload.id.startsWith("fail_")
      ? "declined"
      : stripePayload.id.startsWith("action_")
        ? "requires_action"
        : stripePayload.id.startsWith("unknown_")
          ? "unrecognized_state"
          : "succeeded";
    const response: StripeResponse = { charge_id: `ch_${stripePayload.id}`, state };
    return this.normalizePaymentStatus(response);
  }
}
