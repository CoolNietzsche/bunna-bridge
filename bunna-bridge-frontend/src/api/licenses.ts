import api from "./client";

export interface LicenseReview {
  id: number;
  email: string;
  full_name: string;
  company_name: string;
  role: "exporter" | "roaster";
  ecta_license_number: string;
  ecta_license_expiry: string | null;
  ecta_license_verified_at: string | null;
  lots_count: number;
  date_joined: string;
}

export const getLicenseReviews = async (): Promise<LicenseReview[]> => {
  const { data } = await api.get<LicenseReview[]>("/v1/auth/license-reviews/");
  return data;
};

export const decideLicense = async (id: number, approve: boolean): Promise<LicenseReview> => {
  const { data } = await api.post<LicenseReview>(`/v1/auth/license-reviews/${id}/`, { approve });
  return data;
};
