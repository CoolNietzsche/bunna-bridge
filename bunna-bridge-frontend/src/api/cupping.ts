import api from "./client";

export interface CuppingScore {
  id: string;
  lot: string;
  grader: number;
  grader_name: string;
  grader_email: string;
  status: "pending" | "confirmed" | "disputed";
  total_score: number;
  fragrance_aroma: string;
  flavor: string;
  aftertaste: string;
  acidity: string;
  body: string;
  balance: string;
  uniformity: string;
  clean_cup: string;
  sweetness: string;
  overall: string;
  defects: string;
  flavor_notes: string;
  notes: string;
  cupping_date: string;
  cupping_location: string;
  created_at: string;
}

export interface CuppingScoreInput {
  fragrance_aroma: string;
  flavor: string;
  aftertaste: string;
  acidity: string;
  body: string;
  balance: string;
  uniformity: string;
  clean_cup: string;
  sweetness: string;
  overall: string;
  defects: string;
  flavor_notes: string;
  notes: string;
  cupping_date: string;
  cupping_location: string;
}

export const getCuppingScores = async (lotId: string): Promise<CuppingScore[]> => {
  const { data } = await api.get(`/v1/lots/${lotId}/cupping-scores/`);
  return data;
};

export const submitCuppingScore = async (
  lotId: string,
  score: CuppingScoreInput
): Promise<CuppingScore> => {
  const { data } = await api.post(`/v1/lots/${lotId}/cupping-scores/`, score);
  return data;
};

export const confirmCuppingScore = async (
  lotId: string,
  scoreId: string
): Promise<{ detail: string; total_score: number }> => {
  const { data } = await api.post(
    `/v1/lots/${lotId}/cupping-scores/${scoreId}/confirm`
  );
  return data;
};
