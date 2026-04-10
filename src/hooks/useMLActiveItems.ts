import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MLItem {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  category_id: string;
  shipping?: { free_shipping?: boolean; logistic_type?: string };
}

export function useMLActiveItems(enabled: boolean) {
  return useQuery({
    queryKey: ["ml-active-items"],
    queryFn: async (): Promise<MLItem[]> => {
      const { data, error } = await supabase.functions.invoke("ml-active-items");
      if (error) throw new Error("Erro ao buscar anúncios ativos");
      return data?.items || [];
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
