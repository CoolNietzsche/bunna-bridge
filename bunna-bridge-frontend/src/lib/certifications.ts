import { Leaf, Award, TreePine, Droplet, Coffee, ShieldCheck, ClipboardCheck, Tag } from "lucide-react";
import type { ComponentType } from "react";

export interface LotCertification {
  cert_type: string;
  label: string;
}

/** Icon per Certification.CertType — mirrors the choices in users/models.py. */
export const CERT_ICONS: Record<string, ComponentType<{ size?: number }>> = {
  organic: Leaf,
  fair_trade: Award,
  rainforest_alliance: TreePine,
  utz: Droplet,
  q_arabica: Coffee,
  iso: ShieldCheck,
  haccp: ClipboardCheck,
  other: Tag,
};

export function certIcon(certType: string): ComponentType<{ size?: number }> {
  return CERT_ICONS[certType] ?? Tag;
}
