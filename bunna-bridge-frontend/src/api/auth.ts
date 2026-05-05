import api from "./client";
export interface LoginCredentials { email: string; password: string; }
export interface AuthTokens { access: string; refresh: string; }
export const login = async (creds: LoginCredentials): Promise<AuthTokens> => {
  const { data } = await api.post<AuthTokens>("/auth/token/", creds);
  return data;
};
