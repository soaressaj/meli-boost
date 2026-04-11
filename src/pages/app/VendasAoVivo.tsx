import { useState } from "react";
import { useAuth } from "@/components/layout/Layout";
import { useMPPayments } from "@/hooks/useMPPayments";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useRealtimePayments } from "@/hooks/useRealtimePayments";
import { useMLAdsReport } from "@/hooks/useMLAdsReport";
import { TodayLiveMetrics } from "@/components/vendas/TodayLiveMetrics";
import { KPICards } from "@/components/vendas/KPICards";
import { DailyRevenueChart } from "@/components/vendas/DailyRevenueChart";
import { MonthSummaryBar } from "@/components/vendas/MonthSummaryBar";
import { AdsSection } from "@/components/vendas/AdsSection";
import { SalesTable } from "@/components/vendas/SalesTable";
import { PeriodFilter } from "@/components/vendas/PeriodFilter";
import type { DateRange } from "@/types/mercadopago";

export default function VendasAoVivo() {
  const { user } = useAuth();

  // Default to current month
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  });

  const { data: payments = [], isLoading, refetch } = useMPPayments(dateRange, user?.id);
  const { settings, saveSettings } = useUserSettings(user?.id);

  const dateFrom = dateRange.start.toISOString().split("T")[0];
  const dateTo = dateRange.end.toISOString().split("T")[0];
  const { data: adsReport = [] } = useMLAdsReport(dateFrom, dateTo, !!user?.id);

  useRealtimePayments(user?.id);

  const adsIgnorado = settings?.ads_ignorado ?? false;

  const totalBruto = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.transaction_amount, 0);

  const handleToggleAds = () => {
    saveSettings({ ads_ignorado: !settings?.ads_ignorado });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Vendas ao Vivo - Today's metrics */}
      <TodayLiveMetrics
        payments={payments}
        adsReport={adsReport}
        isLoading={isLoading}
        adsIgnorado={adsIgnorado}
      />

      {/* 2. KPI Cards */}
      <KPICards payments={payments} settings={settings} isLoading={isLoading} />

      {/* 3. Ads toggle */}
      <AdsSection settings={settings} totalBruto={totalBruto} onToggleAds={handleToggleAds} />

      {/* 4. Period filter */}
      <PeriodFilter dateRange={dateRange} onDateRangeChange={setDateRange} />

      {/* 5. Monthly chart with summary */}
      <div className="space-y-3">
        <MonthSummaryBar payments={payments} adsReport={adsReport} adsIgnorado={adsIgnorado} />
        <DailyRevenueChart
          payments={payments}
          isLoading={isLoading}
          settings={settings}
          adsReport={adsReport}
          dateRange={dateRange}
          adsIgnorado={adsIgnorado}
        />
      </div>

      {/* 6. Sales table */}
      <SalesTable payments={payments} isLoading={isLoading} />
    </div>
  );
}
