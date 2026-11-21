export type RuntimeConfigInterface = {
  taxRate: number;
  discountPercent: number;
}

export const runtimeConfig: RuntimeConfigInterface = {taxRate: 0.2, discountPercent: 0}

export const auditLog: string[] = [];
