import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ListingPricing {
  id: string;
  user_id: string;
  ml_item_id: string;
  title: string | null;
  thumbnail: string | null;
  price: number;
  custo_produto: number;
  is_kit: boolean;
  qtd_kit: number;
  bonus_campanha: number;
  taxa_anuncio: number;
  diferenca_icms: number;
  icms_estado: number;
  faixa_peso: string;
  is_full: boolean;
  is_alimento_animal: boolean;
  margem_desejada: number;
  embalagem: number;
  transporte: number;
  etiqueta: number;
  bonus_afiliados: number;
  frete_manual: number | null;
}

export function useListingPricings(userId: string | undefined) {
  return useQuery({
    queryKey: ["listing-pricing", userId],
    queryFn: async (): Promise<ListingPricing[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("listing_pricing" as any)
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!userId,
  });
}

export function useUpsertListingPricing(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pricing: Partial<ListingPricing> & { ml_item_id: string }) => {
      if (!userId) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("listing_pricing" as any)
        .upsert(
          { user_id: userId, ...pricing, updated_at: new Date().toISOString() } as any,
          { onConflict: "user_id,ml_item_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing-pricing", userId] });
    },
  });
}
