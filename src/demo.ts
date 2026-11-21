import { CheckoutController } from "./checkout/CheckoutController.ts";
import { auditLog, runtimeConfig } from "./config.ts";
import { database, resetDatabase } from "./database.ts";
import { OrderService } from "./orders/OrderService.ts";

resetDatabase();
database.stock.set("book", { productId: "book", available: 5 });

const result = await new CheckoutController(new OrderService(), auditLog, runtimeConfig).checkout({
  orderId: "order-demo",
  paymentToken: "tok_demo",
  currency: "UAH",
  lines: [{ productId: "book", unitPrice: 250, quantity: 1 }],
});

console.log(result);
