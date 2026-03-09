import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createAppeal, getMyAppeals, type Appeal } from '@/lib/api/appeals'

export const appealKeys = {
  all: ['appeals'] as const,
  mine: () => [...appealKeys.all, 'mine'] as const,
}

export function useMyAppeals() {
  return useQuery({
    queryKey: appealKeys.mine(),
    queryFn: async () => {
      const data = await getMyAppeals()
      return data.appeals
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCreateAppeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { verificationId: number; reason?: string }) =>
      createAppeal(data.verificationId, data.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appealKeys.all })
    },
  })
}
