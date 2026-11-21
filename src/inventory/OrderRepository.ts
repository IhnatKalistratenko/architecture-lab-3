import { database, type OrderRow } from "../database.ts";

export class OrderRepository {
    find(orderId: string) {
        return database.orders.get(orderId);
    }

    create(order : OrderRow) {
        database.orders.set(order.id ,order);
    }
}
