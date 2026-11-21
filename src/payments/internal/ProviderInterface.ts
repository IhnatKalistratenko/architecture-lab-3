export interface ProviderInterface {
  createCharge(payload: object): Promise<{ state: string }>;
}
