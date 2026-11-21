import { normalizePaymentStatus, type PaymentStatus } from "./PaymentStatus.ts";
import { StripeClient } from "./internal/StripeClient.ts";

export type { PaymentStatus } from "./PaymentStatus.ts";

export type PaymentRequest = {
  paymentToken: string;
  amount: number;
  currency: string;
  orderId: string;
};

export interface PaymentsPort {
  charge(request: PaymentRequest): Promise<PaymentStatus>;
}

export class PaymentsService implements PaymentsPort {
  private readonly stripe: StripeClient;

  constructor(stripe = new StripeClient()) {
    this.stripe = stripe;
  }

  async charge(request: PaymentRequest): Promise<PaymentStatus> {
    const response = await this.stripe.createCharge({
      id: request.paymentToken,
      amount: request.amount,
      currency: request.currency,
      metadata: { orderId: request.orderId },
    });

    return normalizePaymentStatus(response.state);
  }
}
