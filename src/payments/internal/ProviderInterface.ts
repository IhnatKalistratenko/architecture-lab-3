import type { PaymentRequest } from "../PaymentContracts.ts";
import type { PaymentStatus } from "../PaymentStatus.ts";

export interface ProviderInterface {
  charge(request: PaymentRequest): Promise<PaymentStatus>;
}
