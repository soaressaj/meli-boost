import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdsReportDay {
  date: string;
  cost: number;
  clicks: number;
  prints: number;
}

export function useMLAdsReport(dateFrom: string, dateTo: string, enabled: boolean) {
  return useQuery({
    queryKey: ["ml-ads-report", dateFrom, dateTo],
    queryFn: async (): Promise<AdsReportDay[]> => {
      const { data, error } = await supabase.functions.invoke("ml-ads-report", {
        body: { date_from: dateFrom, date_to: dateTo },
      });

      if (error) throw new Error("Erro ao buscar dados de ADS");

      console.log("ML Ads response:", data);

      // Handle daily_metrics response from the corrected API
      if (data?.type === "daily_metrics" && data?.data?.results) {
        const results = data.data.results;
        if (Array.isArray(results)) {
          // Aggregate by date since multiple campaigns may have same date
          const byDate: Record<string, AdsReportDay> = {};
          for (const item of results) {
            const date = item.date || "";
            if (!date) continue;
            if (!byDate[date]) {
              byDate[date] = { date, cost: 0, clicks: 0, prints: 0 };
            }
            byDate[date].cost += Number(item.cost || 0);
            byDate[date].clicks += Number(item.clicks || 0);
            byDate[date].prints += Number(item.prints || 0);
          }
          return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
        }
      }

      return [];
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
