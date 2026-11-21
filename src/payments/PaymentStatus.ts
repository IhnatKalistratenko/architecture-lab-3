export type PaymentStatus = "paid" | "processing" | "failed";

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
