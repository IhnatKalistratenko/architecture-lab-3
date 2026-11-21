import type { ProviderInterface } from "./internal/ProviderInterface.ts";
import { StripeClient } from "./internal/StripeClient.ts";
import { AcmeClient } from "./internal/AcmeClient.ts";
import type { PaymentProviderName, PaymentRequest, PaymentsPort } from "./PaymentContracts.ts";
import type { PaymentStatus } from "./PaymentStatus.ts";

export type { PaymentProviderName, PaymentRequest, PaymentsPort } from "./PaymentContracts.ts";
export type { PaymentStatus } from "./PaymentStatus.ts";

export class PaymentsService implements PaymentsPort {
  async charge(request: PaymentRequest): Promise<PaymentStatus> {
    const provider = createProvider(request.provider);
    return provider.charge(request);
  }
}

function createProvider(provider: PaymentProviderName): ProviderInterface {
  switch (provider) {
    case "stripe":
      return new StripeClient();
    case "acme":
      return new AcmeClient();
    default: {
      const unreachable: never = provider;
      throw new Error(`Unsupported payment provider: ${unreachable}`);
    }
  }
}
