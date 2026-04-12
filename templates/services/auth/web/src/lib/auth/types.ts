export type UserRole = "admin" | "mentor" | "student" | "alumni";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: string;
  };
}

export interface FormActionState {
  error: string | null;
}
