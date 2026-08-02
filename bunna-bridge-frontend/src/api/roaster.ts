import api from "./client";
import type { UserProfile } from "./auth";

export type RoasteryType = "micro" | "commercial" | "cafe" | "other";

export interface RoasterProfile extends UserProfile {
  roastery_type: RoasteryType | "";
  roastery_monthly_capacity_kg: number | null;
  roastery_roast_styles: string;
  roastery_preferred_origins: string;
  roastery_established_year: number | null;
  roastery_website: string;
  phone?: string;
  country?: string;
}

export const getRoasterProfile = async (): Promise<RoasterProfile> => {
  const { data } = await api.get<RoasterProfile>("/v1/auth/roaster/profile/");
  return data;
};

export const updateRoasterProfile = async (
  updates: Partial<RoasterProfile>
): Promise<RoasterProfile> => {
  const { data } = await api.patch<RoasterProfile>("/v1/auth/roaster/profile/", updates);
  return data;
};
