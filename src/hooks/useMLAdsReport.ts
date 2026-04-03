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

      // Handle the report response - adapt to actual ML API structure
      if (data?.type === "report" && data?.data) {
        const results = data.data.results || data.data;
        if (Array.isArray(results)) {
          return results.map((item: any) => ({
            date: item.date || item.date_from || "",
            cost: Number(item.cost || item.total_amount || item.spend || 0),
            clicks: Number(item.clicks || 0),
            prints: Number(item.prints || item.impressions || 0),
          }));
        }
      }

      // If we get campaigns data instead, try to extract cost info
      if (data?.type === "campaigns" && data?.data) {
        console.log("Got campaigns data instead of report:", data.data);
      }

      return [];
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
