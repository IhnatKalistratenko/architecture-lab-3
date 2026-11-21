import type { CartLine } from "../shared/calculateTotal.ts";
import { PaymentsService, type PaymentRequest, type PaymentsPort } from "../payments/PaymentService.ts";
import { StockRepository } from "../inventory/StockRepository.ts";
import { OrderRepository } from "../inventory/OrderRepository.ts";

export class OrderService {
  private readonly payments: PaymentsPort;
  private readonly stockRepository: StockRepository;
  private readonly orderRepository: OrderRepository;

  constructor(payments: PaymentsPort = new PaymentsService(), stockRepository : StockRepository = new StockRepository(), orderRepository : OrderRepository = new OrderRepository()) {
    this.payments = payments;
    this.stockRepository = stockRepository;
    this.orderRepository = orderRepository;
  }

  async placeOrder(orderId: string, lines: CartLine[], total: number, payment: PaymentRequest) {
    this.stockRepository.reserveMany(lines);

    this.orderRepository.create({id: orderId, status: "created", total: total, paymentStatus: undefined});
    const paymentStatus = await this.payments.charge(payment);
    const order = this.orderRepository.find(orderId)!;
    order.paymentStatus = paymentStatus;
    order.status = paymentStatus === "paid" ? "confirmed" : "payment_pending";
    return { ...order };
  }
}
