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

export async function calculateSettlement(
  lotId: string,
  totalUsd: number,
  nbeRate: number = 59.85,
): Promise<SettlementResult> {
  const { data } = await apiClient.post(`/v1/lots/${lotId}/settlement/`, {
    total_usd: totalUsd,
    nbe_rate:  nbeRate,
  });
  return data;
}
