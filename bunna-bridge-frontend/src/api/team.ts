import api from "./client";

export interface Member {
  id: number;
  user_id: number;
  email: string;
  name: string;
  role: string;
  role_label: string;
  joined_at: string;
}

export interface Invitation {
  id: number;
  email: string;
  role: string;
  role_label: string;
  token: string;
  invited_by_email: string | null;
  created_at: string;
  expires_at: string;
  is_open: boolean;
}

export interface MyOrganization {
  organization: { id: string; name: string; kind: string; kind_label: string; country: string; tin: string };
  my_role: string;
  can_manage_team: boolean;
  members: Member[];
  invitations: Invitation[];
  roles: { value: string; label: string }[];
}

export interface ComplianceDoc {
  id: string;
  kind: string;
  kind_label: string;
  number: string;
  holder_name: string;
  amount_birr: string | null;
  issued_on: string | null;
  expires_on: string | null;
  organization_name: string;
  uploaded_by_email: string | null;
  uploaded_at: string;
  verified_at: string | null;
  rejection_reason: string;
  is_expired: boolean;
}

export interface ComplianceState {
  profile: { complete: boolean; items: { kind: string; state: "missing" | "pending" | "verified" | "expired" | "rejected"; document_id: string | null }[] };
  documents: ComplianceDoc[];
  kinds: { value: string; label: string }[];
}

export const getMyOrganization = async (): Promise<MyOrganization> => (await api.get("/v1/orgs/me/")).data;
export const updateOrganization = async (input: { name?: string; tin?: string; country?: string }) =>
  (await api.patch("/v1/orgs/me/", input)).data;
export const inviteMember = async (email: string, role: string): Promise<Invitation> =>
  (await api.post("/v1/orgs/me/invitations/", { email, role })).data;
export const revokeInvitation = async (id: number) => api.delete(`/v1/orgs/me/invitations/${id}/`);
export const changeMemberRole = async (id: number, role: string) =>
  (await api.patch(`/v1/orgs/me/members/${id}/`, { role })).data as Member;
export const removeMember = async (id: number) => api.delete(`/v1/orgs/me/members/${id}/`);

export interface PublicInvitation {
  organization: string;
  kind: string;
  email: string;
  role: string;
  role_label: string;
  has_account: boolean;
}
export const getInvitation = async (token: string): Promise<PublicInvitation> =>
  (await api.get(`/v1/orgs/invitations/${token}/`)).data;
export const acceptInvitation = async (token: string) =>
  (await api.post(`/v1/orgs/invitations/${token}/accept/`)).data as { detail: string };

export const getCompliance = async (): Promise<ComplianceState> => (await api.get("/v1/orgs/me/compliance/")).data;
export const uploadComplianceDoc = async (form: FormData): Promise<ComplianceDoc> =>
  (await api.post("/v1/orgs/me/compliance/", form, { headers: { "Content-Type": "multipart/form-data" } })).data;
export const deleteComplianceDoc = async (id: string) => api.delete(`/v1/orgs/me/compliance/${id}/`);
export const openComplianceDoc = async (id: string) => {
  const res = await api.get(`/v1/orgs/me/compliance/${id}/`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
export const getComplianceReviews = async (): Promise<ComplianceDoc[]> =>
  (await api.get("/v1/orgs/compliance-reviews/")).data;
export const decideComplianceReview = async (id: string, decision: "verify" | "reject", reason = "") =>
  (await api.post(`/v1/orgs/compliance-reviews/${id}/`, { decision, reason })).data as ComplianceDoc;

export const TEAM_ROLE_HELP: Record<string, string> = {
  owner: "Everything, including the team and ownership.",
  admin: "Everything, including inviting and removing teammates.",
  sales: "Lots, offers and samples.",
  quality: "Lots and supply records.",
  logistics: "Lots, documents, compliance profile and supply records.",
  field_agent: "Producers, plots, consent and cherry deliveries — ideal for the offline field app.",
  viewer: "Read-only access.",
};
