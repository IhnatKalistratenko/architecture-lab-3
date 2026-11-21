import { database } from "../database.ts";
import type { CartLine } from "../shared/calculateTotal.ts";
import { PaymentsService, type PaymentRequest, type PaymentsPort } from "../payments/Payments.ts";

export class OrderService {
  private readonly payments: PaymentsPort;

  constructor(payments: PaymentsPort = new PaymentsService()) {
    this.payments = payments;
  }

  async placeOrder(orderId: string, lines: CartLine[], total: number, payment: PaymentRequest) {
    for (const line of lines) {
      const row = database.stock.get(line.productId);
      if (!row || row.available < line.quantity) {
        throw new Error(`Insufficient stock for ${line.productId}`);
      }

      // Deliberate ownership violation: Orders writes Inventory storage directly.
      database.stock.set(line.productId, {
        productId: line.productId,
        available: row.available - line.quantity,
      });
    }

    database.orders.set(orderId, { id: orderId, status: "created", total });
    const paymentStatus = await this.payments.charge(payment);
    const order = database.orders.get(orderId)!;
    order.paymentStatus = paymentStatus;
    order.status = paymentStatus === "paid" ? "confirmed" : "payment_pending";
    return { ...order };
  }
}
