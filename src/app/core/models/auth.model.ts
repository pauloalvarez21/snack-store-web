export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  token?: string;
  user?: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
}
