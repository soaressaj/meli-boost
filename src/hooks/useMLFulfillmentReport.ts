import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FulfillmentCenter {
  id: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  count: number;
  revenue: number;
}

export interface FulfillmentReport {
  centers: FulfillmentCenter[];
  total_orders: number;
  period_days: number;
}

export function useMLFulfillmentReport(lastDays: number = 30) {
  return useQuery({
    queryKey: ["ml-fulfillment-report", lastDays],
    queryFn: async (): Promise<FulfillmentReport> => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Não autenticado");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ml-fulfillment-report?last_days=${lastDays}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Erro ao buscar dados de fulfillment");
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}
