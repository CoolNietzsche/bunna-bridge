import axios from "axios";

export type LeadRole = "exporter" | "cooperative" | "importer" | "roaster" | "other";

export interface LeadInput {
  role: LeadRole;
  name: string;
  email: string;
  company: string;
  country: string;
  phone?: string;
  volume?: string;
  message?: string;
  source?: string;
  /** Honeypot: always empty for real visitors. */
  website?: string;
}

/**
 * Public enquiry form. Uses a bare axios call (not the shared client) so a
 * stale login token is never sent and a 401 can't redirect the visitor.
 */
export async function submitLead(input: LeadInput): Promise<void> {
  await axios.post("/api/v1/market/leads/", input, { headers: { "Content-Type": "application/json" } });
}
