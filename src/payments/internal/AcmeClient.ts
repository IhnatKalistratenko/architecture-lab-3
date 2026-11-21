import type { ProviderInterface } from "./ProviderInterface.ts";
import type { PaymentRequest } from "../PaymentContracts.ts";

type AcmeChargeRequest = {
  paymentReference: string;
  amountMinor: number;
  currencyCode: string;
  merchantOrder: string;
};

type AcmeChargeResponse = {
  transactionReference: string;
  outcome: "APPROVED" | "PENDING_REVIEW" | "REJECTED" | "UNRECOGNIZED_OUTCOME";
};

export class AcmeClient implements ProviderInterface {
  async charge(request: PaymentRequest) {
    const providerRequest: AcmeChargeRequest = {
      paymentReference: request.paymentToken,
      amountMinor: request.amount,
      currencyCode: request.currency,
      merchantOrder: request.orderId,
    };

    const outcome: AcmeChargeResponse["outcome"] = providerRequest.paymentReference.startsWith("fail_")
      ? "REJECTED"
      : providerRequest.paymentReference.startsWith("review_")
        ? "PENDING_REVIEW"
        : providerRequest.paymentReference.startsWith("unknown_")
          ? "UNRECOGNIZED_OUTCOME"
          : "APPROVED";
    const response: AcmeChargeResponse = {
      transactionReference: `acme_${providerRequest.paymentReference}`,
      outcome,
    };

    switch (response.outcome) {
      case "APPROVED":
        return "paid" as const;
      case "PENDING_REVIEW":
        return "processing" as const;
      case "REJECTED":
        return "failed" as const;
      default:
        return "processing" as const;
    }
  }
}
