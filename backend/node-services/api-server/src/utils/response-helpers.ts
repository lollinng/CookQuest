export function formatUserResponse(user: {
  id: number;
  email: string;
  username: string;
  profile?: Record<string, unknown>;
  created_at?: string;
  is_allowed?: boolean;
  is_admin?: boolean;
}, options?: { includeCreatedAt?: boolean }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    profile: user.profile,
    ...(options?.includeCreatedAt && { created_at: user.created_at }),
    is_allowed: user.is_allowed ?? false,
    is_admin: user.is_admin ?? false,
  };
}
