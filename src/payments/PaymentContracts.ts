import type { PaymentStatus } from "./PaymentStatus.ts";

export type PaymentProviderName = "stripe" | "acme";

export type PaymentRequest = {
  provider: PaymentProviderName;
  paymentToken: string;
  amount: number;
  currency: string;
  orderId: string;
};

export interface PaymentsPort {
  charge(request: PaymentRequest): Promise<PaymentStatus>;
}
