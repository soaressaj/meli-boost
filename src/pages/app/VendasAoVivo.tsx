import { useState } from "react";
import { useAuth } from "@/components/layout/Layout";
import { useMPPayments } from "@/hooks/useMPPayments";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useRealtimePayments } from "@/hooks/useRealtimePayments";
import { FaturamentoHeader } from "@/components/vendas/FaturamentoHeader";
import { DailyRevenueChart } from "@/components/vendas/DailyRevenueChart";
import { PeriodFilter } from "@/components/vendas/PeriodFilter";
import { KPICards } from "@/components/vendas/KPICards";
import { AdsSection } from "@/components/vendas/AdsSection";
import { SalesTable } from "@/components/vendas/SalesTable";
import type { DateRange } from "@/types/mercadopago";

export default function VendasAoVivo() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(),
    end: new Date(),
  });

  const { data: payments = [], isLoading, refetch } = useMPPayments(dateRange, user?.id);
  const { settings, saveSettings } = useUserSettings(user?.id);

  // Realtime: plays sound on new sale and auto-refetches data
  useRealtimePayments(user?.id);

  const totalBruto = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.transaction_amount, 0);

  const handleToggleAds = () => {
    saveSettings({ ads_ignorado: !settings?.ads_ignorado });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <FaturamentoHeader payments={payments} isLoading={isLoading} />
      </div>
      <PeriodFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      <KPICards payments={payments} settings={settings} isLoading={isLoading} />
      <AdsSection settings={settings} totalBruto={totalBruto} onToggleAds={handleToggleAds} />
      <SalesTable payments={payments} isLoading={isLoading} />
    </div>
  );
}
