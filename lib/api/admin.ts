import { apiClient } from './client';

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  is_allowed: boolean;
  is_admin: boolean;
  created_at: string;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const data = await apiClient<{ users: AdminUser[] }>('/admin/users');
  return data.users;
}

export async function setUserAllowed(userId: number, isAllowed: boolean): Promise<void> {
  await apiClient(`/admin/users/${userId}/allow`, {
    method: 'PATCH',
    body: { is_allowed: isAllowed },
  });
}
