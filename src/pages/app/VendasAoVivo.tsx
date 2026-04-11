import { useState } from "react";
import { useAuth } from "@/components/layout/Layout";
import { useMPPayments } from "@/hooks/useMPPayments";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useRealtimePayments } from "@/hooks/useRealtimePayments";
import { useMLAdsReport } from "@/hooks/useMLAdsReport";
import { useMLVisitsReport } from "@/hooks/useMLVisitsReport";
import { TodayLiveMetrics } from "@/components/vendas/TodayLiveMetrics";
import { MonthlyRevenueChart } from "@/components/vendas/MonthlyRevenueChart";
import { AnnualRevenueChart } from "@/components/vendas/AnnualRevenueChart";
import { AdsSection } from "@/components/vendas/AdsSection";
import { SalesTable } from "@/components/vendas/SalesTable";
import { subMonths, format } from "date-fns";

export default function VendasAoVivo() {
  const { user } = useAuth();
  const now = new Date();

  // Current month range for monthly chart
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Last 12 months for annual chart
  const annualStart = subMonths(new Date(now.getFullYear(), now.getMonth(), 1), 11);

  const { data: monthPayments = [], isLoading } = useMPPayments(
    { start: monthStart, end: monthEnd },
    user?.id
  );

  const { data: annualPayments = [] } = useMPPayments(
    { start: annualStart, end: monthEnd },
    user?.id
  );

  const { settings, saveSettings } = useUserSettings(user?.id);

  const dateFrom = monthStart.toISOString().split("T")[0];
  const dateTo = monthEnd.toISOString().split("T")[0];
  const { data: adsReport = [] } = useMLAdsReport(dateFrom, dateTo, !!user?.id);

  // Visits funnel for today
  const today = now.toISOString().split("T")[0];
  const { data: visitsFunnel } = useMLVisitsReport(today, today, 1, !!user?.id);

  useRealtimePayments(user?.id);

  const adsIgnorado = settings?.ads_ignorado ?? false;

  const totalBruto = monthPayments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.transaction_amount, 0);

  const handleToggleAds = () => {
    saveSettings({ ads_ignorado: !settings?.ads_ignorado });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Main layout: left panel + right charts */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Left: Today live metrics */}
        <TodayLiveMetrics
          payments={monthPayments}
          adsReport={adsReport}
          isLoading={isLoading}
          adsIgnorado={adsIgnorado}
          visitsFunnel={visitsFunnel}
          allMonthPayments={monthPayments}
        />

        {/* Right: Charts stacked */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 min-h-[280px]">
            <MonthlyRevenueChart
              payments={monthPayments}
              adsReport={adsReport}
              adsIgnorado={adsIgnorado}
            />
          </div>
          <div className="flex-1 min-h-[280px]">
            <AnnualRevenueChart payments={annualPayments} />
          </div>
        </div>
      </div>

      {/* Ads toggle */}
      <AdsSection settings={settings} totalBruto={totalBruto} onToggleAds={handleToggleAds} />

      {/* Sales table */}
      <SalesTable payments={monthPayments} isLoading={isLoading} />
    </div>
  );
}
