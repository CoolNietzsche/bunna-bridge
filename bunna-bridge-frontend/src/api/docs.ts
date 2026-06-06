import apiClient from "./client";

// ── Lot document uploads ──────────────────────────────────────────

export async function uploadPhytoCert(lotId: string, file: File, expiry?: string) {
  const fd = new FormData();
  fd.append("phyto_cert_file", file);
  if (expiry) fd.append("phyto_cert_expiry", expiry);
  const res = await apiClient.patch(`/v1/lots/${lotId}/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadEcexPermit(
  lotId: string,
  file: File,
  number: string,
  expiry?: string
) {
  const fd = new FormData();
  fd.append("ecex_permit_file", file);
  fd.append("ecex_permit_number", number);
  if (expiry) fd.append("ecex_permit_expiry", expiry);
  const res = await apiClient.patch(`/v1/lots/${lotId}/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadNbeFxDeclaration(lotId: string, file: File) {
  const fd = new FormData();
  fd.append("nbe_fx_declaration_file", file);
  const res = await apiClient.patch(`/v1/lots/${lotId}/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function saveCustomsDeclaration(
  lotId: string,
  declarationId: string,
  file?: File
) {
  const fd = new FormData();
  fd.append("customs_declaration_id", declarationId);
  if (file) fd.append("customs_declaration_file", file);
  const res = await apiClient.patch(`/v1/lots/${lotId}/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// ── Exporter profile — ECTA license ──────────────────────────────

export async function uploadEctaLicense(
  file: File,
  number: string,
  expiry?: string
) {
  const fd = new FormData();
  fd.append("ecta_license_file", file);
  fd.append("ecta_license_number", number);
  if (expiry) fd.append("ecta_license_expiry", expiry);
  const res = await apiClient.patch(`/v1/auth/me/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// ── Helpers ───────────────────────────────────────────────────────

export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${window.location.protocol}//${window.location.hostname}:8001${path.startsWith("/") ? "" : "/"}${path}`;
}
