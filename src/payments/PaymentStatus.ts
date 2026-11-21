export type PaymentStatus = "paid" | "processing" | "failed";

/** Convert provider-specific states to the stable Payments contract. */
export function normalizePaymentStatus(providerStatus: string): PaymentStatus {
  switch (providerStatus) {
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
