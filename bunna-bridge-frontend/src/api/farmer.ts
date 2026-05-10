import api from "./client";
import type { UserProfile } from "./auth";
import type { CoffeeLot } from "./lots";

export interface FarmerProfile extends UserProfile {
  farm_name:       string;
  farm_region:     string;
  farm_kebele:     string;
  farm_altitude_m: number | null;
  farm_size_ha:    string | null;
  cooperative:     string;
  gps_lat:         string | null;
  gps_lng:         string | null;
}

export const getFarmerProfile = async (): Promise<FarmerProfile> => {
  const { data } = await api.get<FarmerProfile>("/v1/auth/farmer/profile/");
  return data;
};

export const updateFarmerProfile = async (
  updates: Partial<FarmerProfile>
): Promise<FarmerProfile> => {
  const { data } = await api.patch<FarmerProfile>("/v1/auth/farmer/profile/", updates);
  return data;
};

export const getFarmerLots = async (): Promise<CoffeeLot[]> => {
  const { data } = await api.get<CoffeeLot[]>("/v1/auth/farmer/lots/");
  return data;
};
