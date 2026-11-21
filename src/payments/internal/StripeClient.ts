import type { ProviderInterface } from "./ProviderInterface.ts";

export type StripePayload = {
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
  async createCharge(payload: StripePayload): Promise<StripeResponse> {
    const state = payload.id.startsWith("fail_")
      ? "declined"
      : payload.id.startsWith("action_")
        ? "requires_action"
        : "succeeded";
    const response: StripeResponse = { charge_id: `ch_${payload.id}`, state };
    return response;
  }
}
