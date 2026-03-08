import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminUsers, setUserAllowed } from '@/lib/api/admin';

export const adminKeys = {
  all: ['admin-users'] as const,
};

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.all,
    queryFn: getAdminUsers,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });
}

export function useToggleUserAllowed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isAllowed }: { userId: number; isAllowed: boolean }) =>
      setUserAllowed(userId, isAllowed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}
