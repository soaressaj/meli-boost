import { useMemo, useState } from "react";
import type { MPPayment } from "@/types/mercadopago";
import type { AdsReportDay } from "@/hooks/useMLAdsReport";
import type { VisitsFunnel } from "@/hooks/useMLVisitsReport";
import type { ListingPricing } from "@/hooks/useListingPricing";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildPricingMaps,
  calcListingUnitProfit,
  getPaymentDateKey,
  getPaymentItems,
  resolvePricing,
  toLocalDateKey,
} from "@/lib/vendas-metrics";

type PeriodKey = "hoje" | "7d" | "15d" | "30d" | "custom";

interface Props {
  payments: MPPayment[];
  adsReport: AdsReportDay[];
  isLoading: boolean;
  adsIgnorado: boolean;
  visitsFunnel?: VisitsFunnel | null;
  allMonthPayments: MPPayment[];
  listingPricings?: ListingPricing[];
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const periodLabels: Record<PeriodKey, string> = {
  hoje: "Hoje",
  "7d": "7 dias",
  "15d": "15 dias",
  "30d": "30 dias",
  custom: "Personalizado",
};

export function TodayLiveMetrics({
  payments,
  adsReport,
  isLoading,
  adsIgnorado,
  visitsFunnel,
  allMonthPayments,
  listingPricings = [],
}: Props) {
  const now = new Date();
  const todayStr = toLocalDateKey(now);
  const [period, setPeriod] = useState<PeriodKey>("hoje");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [lucroDescontaAds, setLucroDescontaAds] = useState(true);

  const costMap = useMemo(() => buildPricingMaps(listingPricings), [listingPricings]);

  const periodRange = useMemo(() => {
    const end = now;
    if (period === "hoje") return { start: todayStr, end: todayStr };
    if (period === "7d") return { start: format(subDays(end, 6), "yyyy-MM-dd"), end: todayStr };
    if (period === "15d") return { start: format(subDays(end, 14), "yyyy-MM-dd"), end: todayStr };
    if (period === "30d") return { start: format(subDays(end, 29), "yyyy-MM-dd"), end: todayStr };
    if (period === "custom" && customFrom && customTo) return { start: customFrom, end: customTo };
    return { start: todayStr, end: todayStr };
  }, [period, customFrom, customTo, todayStr]);

  // Always compute today's revenue for the hero display
  const todayFaturamento = useMemo(() => {
    return allMonthPayments
      .filter((p) => {
        const d = getPaymentDateKey(p);
        return d === todayStr && p.status === "approved";
      })
      .reduce((s, p) => s + p.transaction_amount, 0);
  }, [allMonthPayments, todayStr]);

  const metrics = useMemo(() => {
    const filtered = allMonthPayments.filter((p) => {
      const d = getPaymentDateKey(p);
      return d >= periodRange.start && d <= periodRange.end;
    });

    const approved = filtered.filter((p) => p.status === "approved");
    const cancelled = filtered.filter((p) => p.status === "cancelled" || p.status === "refunded");

    const faturamento = approved.reduce((s, p) => s + p.transaction_amount, 0);

    // Total a liberar = net de vendas aprovadas ainda não liberadas (de TODOS os pagamentos, não filtrado por período)
    const totalALiberar = allMonthPayments
      .filter((p) => p.status === "approved" && p.money_release_status !== "released")
      .reduce((s, p) => {
        const net = p.transaction_details?.net_received_amount ??
          (p.transaction_amount - p.fee_details.reduce((fs, f) => fs + f.amount, 0));
        return s + net;
      }, 0);

    // Lucro bruto (sem descontar ads) = faturamento - tarifas MP/ML - custos do produto/embalagem/etc
    let lucroBruto = 0;
    for (const payment of approved) {
      const items = getPaymentItems(payment);
      let matchedItem = false;

      for (const item of items) {
        const pricing = resolvePricing(item, costMap);
        if (!pricing) continue;

        matchedItem = true;
        lucroBruto += calcListingUnitProfit(pricing) * item.quantity;
      }

      if (!matchedItem) {
        const fees = payment.fee_details.reduce((s, f) => s + f.amount, 0);
        lucroBruto += payment.transaction_amount - fees;
      }
    }

    const periodAds = adsReport
      .filter((a) => a.date >= periodRange.start && a.date <= periodRange.end)
      .reduce((s, a) => s + a.cost, 0);

    const gastoAds = adsIgnorado ? 0 : periodAds;
    const lucro = lucroBruto - gastoAds;
    const custo = faturamento - lucro;

    return {
      faturamento,
      lucro,
      lucroBruto,
      gastoAds,
      totalALiberar,
      custo,
      vendas: approved.length,
      canceladas: cancelled.length,
    };
  }, [allMonthPayments, adsReport, adsIgnorado, costMap, periodRange]);

  if (isLoading) {
    return (
      <div className="bg-[hsl(0,0%,10%)] rounded-xl p-5 shadow-lg">
        <Skeleton className="h-6 w-48 mb-4 bg-white/20" />
        <Skeleton className="h-16 w-40 mx-auto mb-4 bg-white/20" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 bg-white/20" />
          ))}
        </div>
      </div>
    );
  }

  const visitas = visitsFunnel?.total_visits ?? 0;
  const intCompras = visitsFunnel?.purchase_intent ?? 0;
  const conversao = visitsFunnel?.conversion_rate ?? 0;

  return (
    <div className="bg-gradient-to-br from-[hsl(0,0%,8%)] to-[hsl(0,0%,14%)] rounded-xl p-5 shadow-lg text-white space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-base font-bold tracking-wide">Vendas ao vivo</h2>
        <div className="flex items-center justify-center gap-1.5 text-xs opacity-80">
          <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          {format(now, "dd 'de' MMMM, HH:mm:ss", { locale: ptBR })}
        </div>
      </div>

      {/* TODAY hero - always visible */}
      <div className="bg-[hsl(153,100%,40%)]/20 border-2 border-[hsl(153,100%,40%)]/40 backdrop-blur rounded-lg py-4 text-center">
        <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Faturamento Hoje</p>
        <p className="text-4xl font-black tracking-tight text-[hsl(153,100%,60%)]">{fmt(todayFaturamento)}</p>
      </div>

      {/* Period filter */}
      <div className="flex gap-1 flex-wrap justify-center">
        {(["hoje", "7d", "15d", "30d", "custom"] as PeriodKey[]).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={period === key ? "default" : "ghost"}
            className={`text-[10px] h-7 px-2 ${
              period === key
                ? "bg-[hsl(153,100%,40%)] text-black hover:bg-[hsl(153,100%,35%)]"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setPeriod(key)}
          >
            {periodLabels[key]}
          </Button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex gap-2">
          <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className="h-7 text-xs bg-white/10 border-white/20 text-white" />
          <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className="h-7 text-xs bg-white/10 border-white/20 text-white" />
        </div>
      )}

      {/* Period stats (when not "hoje", show period faturamento too) */}
      {period !== "hoje" && (
        <div className="bg-white/5 border border-white/10 rounded-lg py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">Faturamento {periodLabels[period]}</p>
          <p className="text-xl font-bold text-[hsl(153,100%,60%)]">{fmt(metrics.faturamento)}</p>
        </div>
      )}

      {/* Row: lucro / total a liberar */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/10 backdrop-blur rounded-md p-2 text-center border border-white/10 relative">
          <p className="text-[10px] font-medium opacity-80 uppercase tracking-wide">
            Lucro {periodLabels[period]}
          </p>
          <p className="text-sm font-bold text-blue-400">
            {fmt(lucroDescontaAds ? metrics.lucroBruto - metrics.gastoAds : metrics.lucroBruto)}
          </p>
          <button
            type="button"
            onClick={() => setLucroDescontaAds((v) => !v)}
            className={`mt-1 text-[8px] px-1.5 py-0.5 rounded-full border transition-colors ${
              lucroDescontaAds
                ? "bg-pink-500/30 border-pink-400/60 text-pink-200"
                : "bg-white/5 border-white/20 text-white/60"
            }`}
            title={lucroDescontaAds ? `Descontando ${fmt(metrics.gastoAds)} de Ads` : "Clique para abater Ads"}
          >
            {lucroDescontaAds ? `− Ads (${fmt(metrics.gastoAds)})` : "+ Abater Ads"}
          </button>
        </div>
        <MetricBox label="Total a Liberar" value={fmt(metrics.totalALiberar)} subtitle="Saldo pendente" valueColor="text-green-300" />
      </div>

      {/* Row: custo / canceladas */}
      <div className="grid grid-cols-2 gap-2">
        <MetricBox label={`Custo ${periodLabels[period]}`} value={fmt(metrics.custo)} valueColor="text-red-300" />
        <MetricBox label="Canceladas" value={String(metrics.canceladas)} valueColor="text-red-300" />
      </div>

      {/* Divider */}
      <div className="border-t border-white/20" />

      {/* Row: Visitas / Int. Compras / Vendas */}
      <div className="grid grid-cols-3 gap-2">
        <MetricBox label="Visitas" value={String(visitas)} />
        <MetricBox label="Int. Compras" value={String(intCompras)} />
        <MetricBox label="Vendas" value={String(metrics.vendas)} />
      </div>

      {/* Row: Unidades Vendidas / Conversão */}
      <div className="grid grid-cols-2 gap-2">
        <MetricBox label="Unid. Vendidas" value={String(metrics.vendas)} />
        <MetricBox label="Conversão" value={`${conversao.toFixed(2)}%`} />
      </div>
    </div>
  );
}

function MetricBox({ label, value, subtitle, valueColor = "text-white" }: { label: string; value: string; subtitle?: string; valueColor?: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-md p-2 text-center border border-white/10">
      <p className="text-[10px] font-medium opacity-80 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold ${valueColor}`}>{value}</p>
      {subtitle && <p className="text-[8px] opacity-50 mt-0.5">{subtitle}</p>}
    </div>
  );
}
