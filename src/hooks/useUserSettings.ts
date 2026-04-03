import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserSettings } from "@/types/mercadopago";
import { toast } from "sonner";

export function useUserSettings(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-settings', userId],
    queryFn: async (): Promise<UserSettings | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as UserSettings | null;
    },
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      if (!userId) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', userId] });
      toast.success('Configurações salvas!');
    },
    onError: () => {
      toast.error('Erro ao salvar configurações');
    },
  });

  return { settings: query.data, isLoading: query.isLoading, saveSettings: mutation.mutate };
}
