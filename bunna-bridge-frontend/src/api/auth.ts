import api from "./client";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: "admin" | "exporter" | "buyer" | "farmer" | "qgrader";
  company_name: string;
  is_verified: boolean;
  first_name?: string;
  last_name?: string;
  ecta_license_file?: string | null;
  ecta_license_number?: string | null;
  ecta_license_expiry?: string | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: UserProfile;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
  role: string;
  company_name?: string;
  phone?: string;
  country?: string;
}

export const login = async (creds: LoginCredentials): Promise<AuthTokens> => {
  const { data } = await api.post<AuthTokens>("/auth/token/", creds);
  return data;
};

export const register = async (data: RegisterData) => {
  const { data: res } = await api.post("/v1/auth/register/", data);
  return res;
};

export const getMe = async (): Promise<UserProfile> => {
  const { data } = await api.get<UserProfile>("/v1/auth/me/");
  return data;
};
