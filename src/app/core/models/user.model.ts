export type UserRole = 'CUSTOMER' | 'ADMIN' | 'DELIVERY';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  /** Enviar null para limpiar el teléfono. */
  phone?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}
