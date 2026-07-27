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

// ── Authenticated document viewing ──────────────────────────────────
// Compliance documents are no longer served directly from /media/ — the
// storage paths are blocked at the nginx layer. These fetch through the
// authenticated download views (owner/admin only) and open the result as
// a blob URL, replacing the old <a href={getMediaUrl(...)}> pattern.

async function openAsBlob(url: string): Promise<void> {
  const response = await apiClient.get(url, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(response.data as Blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
}

export function viewLotDocument(lotId: string, fieldName: string): Promise<void> {
  return openAsBlob(`/v1/lots/${lotId}/documents/${fieldName}/`);
}

export function viewExporterEctaLicense(exporterId: string | number): Promise<void> {
  return openAsBlob(`/v1/auth/exporters/${exporterId}/ecta-license/`);
}

// ── Helpers ───────────────────────────────────────────────────────

export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${window.location.origin}${path.startsWith("/") ? "" : "/"}${path}`;
}
