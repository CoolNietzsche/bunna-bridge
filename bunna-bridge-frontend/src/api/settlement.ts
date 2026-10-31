import apiClient from './client';

export interface SettlementResult {
  lot_id: string;
  lot_ref: string;
  total_usd: number;
  platform_fee: number;
  net_usd: number;
  usd_retained: number;
  etb_converted: number;
  nbe_rate: number;
  split_percent: number;
  calculated_at: string;
}

/**
 * nbeRate is optional: when omitted the server uses its configured
 * NBE_DEFAULT_FX_RATE, so the frontend never hardcodes an exchange rate.
 */
export async function calculateSettlement(
  lotId: string,
  totalUsd: number,
  nbeRate?: number,
): Promise<SettlementResult> {
  const body: Record<string, number> = { total_usd: totalUsd };
  if (nbeRate !== undefined && Number.isFinite(nbeRate) && nbeRate > 0) body.nbe_rate = nbeRate;
  const { data } = await apiClient.post(`/v1/lots/${lotId}/settlement/`, body);
  return data;
}
