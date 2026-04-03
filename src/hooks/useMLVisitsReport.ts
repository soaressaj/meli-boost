import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VisitsFunnel {
  total_visits: number;
  purchase_intent: number;
  purchase_intent_amount: number;
  completed_sales: number;
  completed_sales_amount: number;
  conversion_rate: number;
}

export function useMLVisitsReport(dateFrom: string, dateTo: string, lastDays: number, enabled: boolean) {
  return useQuery({
    queryKey: ["ml-visits-report", dateFrom, dateTo, lastDays],
    queryFn: async (): Promise<VisitsFunnel> => {
      const { data, error } = await supabase.functions.invoke("ml-visits-report", {
        body: { date_from: dateFrom, date_to: dateTo, last_days: lastDays },
      });

      if (error) throw new Error("Erro ao buscar dados de visitas");

      return {
        total_visits: data?.total_visits ?? 0,
        purchase_intent: data?.purchase_intent ?? 0,
        purchase_intent_amount: data?.purchase_intent_amount ?? 0,
        completed_sales: data?.completed_sales ?? 0,
        completed_sales_amount: data?.completed_sales_amount ?? 0,
        conversion_rate: data?.conversion_rate ?? 0,
      };
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
