import { database } from "../database.ts";

export class StockRepository {
  find(productId: string) {
    return database.stock.get(productId);
  }

  reserveMany(lines: Array<{ productId: string; quantity: number }>): void {
    const quantities = new Map<string, number>();
    for (const line of lines) {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new RangeError("Quantity must be a positive integer");
      }
      quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
    }

    for (const [productId, quantity] of quantities) {
      const product = database.stock.get(productId);
      if (!product) throw new RangeError(`Product not found: ${productId}`);
      if (product.available < quantity) {
        throw new RangeError(`Insufficient stock for ${productId}`);
      }
    }

    for (const [productId, quantity] of quantities) {
      const product = database.stock.get(productId)!;
      database.stock.set(productId, { ...product, available: product.available - quantity });
    }
  }
}
