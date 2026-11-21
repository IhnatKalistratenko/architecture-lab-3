import { calculateTotal, type CartLine } from "../shared/calculateTotal.ts";
import { OrderService } from "../orders/OrderService.ts";
import { auditLog, runtimeConfig, type RuntimeConfigInterface } from "../config.ts";
import type { PaymentProviderName } from "../payments/PaymentService.ts";

export type CheckoutRequest = {
  orderId: string;
  paymentToken: string;
  provider: PaymentProviderName;
  currency: string;
  lines: CartLine[];
};

export class CheckoutController {
  private readonly orders: OrderService;
  private readonly logger: string[];
  private readonly config: RuntimeConfigInterface;

  constructor(
    orders = new OrderService(),
    logger: string[] = auditLog,
    config: RuntimeConfigInterface = runtimeConfig,
  ) {
    this.orders = orders;
    this.logger = logger;
    this.config = config;
  }

  async checkout(request: CheckoutRequest) {
    const total = calculateTotal(request.lines, this.config.discountPercent, this.config.taxRate);
    this.logger.push(`total_calculated:${total}`);

    const payment = {
      paymentToken: request.paymentToken,
      amount: Math.round(total * 100),
      currency: request.currency,
      orderId: request.orderId,
      provider: request.provider,
    };

    const order = await this.orders.placeOrder(
      request.orderId,
      request.lines,
      total,
      payment,
    );

    return {
      orderId: order.id,
      status: order.status,
      total: order.total,
      paymentStatus: order.paymentStatus,
    };
  }
}
