export type CartLine = {
  productId: string;
  unitPrice: number;
  quantity: number;
  lineTotal?: number;
};

export function calculateTotal(lines: CartLine[], discountPercent: number, taxRate: number): number {
  let subtotal = 0;

  for (const line of lines) {
    subtotal += line.unitPrice * line.quantity;
  }

  const discounted = subtotal * (1 - discountPercent / 100);
  const total = Number((discounted * (1 + taxRate)).toFixed(2));
  return total;
}
