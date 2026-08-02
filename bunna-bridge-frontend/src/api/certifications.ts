import api from "./client";

export type CertType =
  | "organic"
  | "fair_trade"
  | "rainforest_alliance"
  | "utz"
  | "q_arabica"
  | "iso"
  | "haccp"
  | "other";

export interface Certification {
  id: string;
  cert_type: CertType;
  issuing_body: string;
  cert_number: string;
  issue_date: string | null;
  expiry_date: string | null;
  file: string | null;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
}

export const getCertifications = async (): Promise<Certification[]> => {
  const { data } = await api.get<Certification[] | { results: Certification[] }>(
    "/v1/auth/certifications/"
  );
  return Array.isArray(data) ? data : data.results;
};

export interface CertificationInput {
  cert_type: CertType;
  issuing_body?: string;
  cert_number?: string;
  issue_date?: string;
  expiry_date?: string;
  file?: File;
}

function toFormData(input: Partial<CertificationInput>): FormData {
  const fd = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      fd.append(key, value as string | Blob);
    }
  });
  return fd;
}

export const createCertification = async (
  input: CertificationInput
): Promise<Certification> => {
  const { data } = await api.post<Certification>(
    "/v1/auth/certifications/",
    toFormData(input),
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const updateCertification = async (
  id: string,
  input: Partial<CertificationInput>
): Promise<Certification> => {
  const { data } = await api.patch<Certification>(
    `/v1/auth/certifications/${id}/`,
    toFormData(input),
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const deleteCertification = async (id: string): Promise<void> => {
  await api.delete(`/v1/auth/certifications/${id}/`);
};
