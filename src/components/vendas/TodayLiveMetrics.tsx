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

type PeriodKey = "7d" | "15d" | "30d" | "custom";

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

/** Build a cost lookup from listing_pricing data keyed by lowercase description fragment */
function buildCostMap(pricings: ListingPricing[]) {
  const map: Record<string, ListingPricing> = {};
  for (const lp of pricings) {
    if (lp.ml_item_id) map[lp.ml_item_id] = lp;
    if (lp.title) map[lp.title.toLowerCase()] = lp;
  }
  return map;
}

function findPricingForPayment(payment: MPPayment, costMap: Record<string, ListingPricing>): ListingPricing | undefined {
  // Try matching by description (title)
  const desc = payment.description?.toLowerCase();
  if (desc) {
    for (const key of Object.keys(costMap)) {
      if (desc.includes(key) || key.includes(desc)) return costMap[key];
    }
  }
  return undefined;
}

function calcPaymentProfit(
  payment: MPPayment,
  pricing: ListingPricing | undefined,
  adsIgnorado: boolean,
  adsCostForDay: number,
  totalApprovedForDay: number
) {
  const amount = payment.transaction_amount;
  const fees = payment.fee_details.reduce((s, f) => s + f.amount, 0);

  if (!pricing) {
    // Fallback: revenue minus fees
    return amount - fees;
  }

  const custoProduto = pricing.custo_produto || 0;
  const embalagem = pricing.embalagem || 0;
  const transporte = pricing.transporte || 0;
  const etiqueta = pricing.etiqueta || 0;
  const bonusAfiliados = amount * ((pricing.bonus_afiliados || 0) / 100);
  const icmsDif = amount * ((pricing.diferenca_icms || 0) / 100);

  const totalCosts = custoProduto + embalagem + transporte + etiqueta + bonusAfiliados + icmsDif + fees;
  return amount - totalCosts;
}

export function TodayLiveMetrics({
  payments,
  adsReport,
  isLoading,
  adsIgnorado,
  visitsFunnel,
  allMonthPayments,
  listingPricings = [],
}: Props) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const costMap = useMemo(() => buildCostMap(listingPricings), [listingPricings]);

  const periodRange = useMemo(() => {
    const end = now;
    if (period === "7d") return { start: subDays(end, 6), end };
    if (period === "15d") return { start: subDays(end, 14), end };
    if (period === "30d") return { start: subDays(end, 29), end };
    if (period === "custom" && customFrom && customTo) {
      return { start: new Date(customFrom), end: new Date(customTo) };
    }
    return { start: subDays(end, 6), end };
  }, [period, customFrom, customTo, now]);

  const metrics = useMemo(() => {
    // Today metrics
    const todayPayments = payments.filter((p) => {
      const d = (p.date_approved || p.date_created).split("T")[0];
      return d === today;
    });
    const approved = todayPayments.filter((p) => p.status === "approved");
    const cancelled = todayPayments.filter((p) => p.status === "cancelled" || p.status === "refunded");
    const faturamento = approved.reduce((s, p) => s + p.transaction_amount, 0);
    const tarifas = approved.reduce((s, p) => s + p.fee_details.reduce((fs, f) => fs + f.amount, 0), 0);
    const todayAds = adsReport.filter((a) => a.date === today).reduce((s, a) => s + a.cost, 0);

    // Total a receber = net_received (valor a liberar MP)
    const totalAReceber = approved.reduce((s, p) => {
      const net = p.transaction_details?.net_received_amount ?? (p.transaction_amount - p.fee_details.reduce((fs, f) => fs + f.amount, 0));
      return s + net;
    }, 0);

    // Lucro do dia using individual listing costs
    let lucroDia = 0;
    for (const p of approved) {
      const pricing = findPricingForPayment(p, costMap);
      lucroDia += calcPaymentProfit(p, pricing, adsIgnorado, todayAds, approved.length);
    }
    if (!adsIgnorado) lucroDia -= todayAds;

    const custoDia = faturamento - lucroDia;

    // Period metrics
    const periodStart = format(periodRange.start, "yyyy-MM-dd");
    const periodEnd = format(periodRange.end, "yyyy-MM-dd");
    const periodPayments = allMonthPayments.filter((p) => {
      const d = (p.date_approved || p.date_created).split("T")[0];
      return d >= periodStart && d <= periodEnd && p.status === "approved";
    });
    const periodFat = periodPayments.reduce((s, p) => s + p.transaction_amount, 0);
    let lucroPeriodo = 0;
    for (const p of periodPayments) {
      const pricing = findPricingForPayment(p, costMap);
      lucroPeriodo += calcPaymentProfit(p, pricing, adsIgnorado, 0, periodPayments.length);
    }
    const periodAds = adsReport
      .filter((a) => a.date >= periodStart && a.date <= periodEnd)
      .reduce((s, a) => s + a.cost, 0);
    if (!adsIgnorado) lucroPeriodo -= periodAds;

    return {
      faturamento,
      lucroDia,
      totalAReceber,
      custoDia,
      lucroPeriodo,
      vendas: approved.length,
      canceladas: cancelled.length,
      unidadesVendidas: approved.length,
      periodVendas: periodPayments.length,
      periodFat,
    };
  }, [payments, adsReport, today, adsIgnorado, allMonthPayments, costMap, periodRange]);

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

  const periodLabels: Record<PeriodKey, string> = {
    "7d": "7 dias",
    "15d": "15 dias",
    "30d": "30 dias",
    custom: "Personalizado",
  };

  return (
    <div className="bg-gradient-to-br from-[hsl(0,0%,8%)] to-[hsl(0,0%,14%)] rounded-xl p-5 shadow-lg text-white space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-base font-bold tracking-wide">Vendas de hoje ao vivo</h2>
        <div className="flex items-center justify-center gap-1.5 text-xs opacity-80">
          <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          {format(now, "dd 'de' MMMM, HH:mm:ss", { locale: ptBR })}
        </div>
      </div>

      {/* Main value */}
      <div className="bg-[hsl(153,100%,40%)]/20 border border-[hsl(153,100%,40%)]/30 backdrop-blur rounded-lg py-3 text-center">
        <p className="text-3xl font-extrabold tracking-tight text-[hsl(153,100%,60%)]">{fmt(metrics.faturamento)}</p>
      </div>

      {/* Row: lucro dia / total a receber */}
      <div className="grid grid-cols-2 gap-2">
        <MetricBox label="Lucro do dia" value={fmt(metrics.lucroDia)} valueColor="text-green-300" />
        <MetricBox label="Total a Receber" value={fmt(metrics.totalAReceber)} valueColor="text-green-300" />
      </div>

      {/* Row: custo dia / lucro período */}
      <div className="grid grid-cols-2 gap-2">
        <MetricBox label="Custo do dia" value={fmt(metrics.custoDia)} valueColor="text-red-300" />
        <MetricBox label={`Lucro ${periodLabels[period]}`} value={fmt(metrics.lucroPeriodo)} valueColor="text-green-300" />
      </div>

      {/* Period filter */}
      <div className="border-t border-white/20 pt-3">
        <div className="flex gap-1 flex-wrap justify-center">
          {(["7d", "15d", "30d", "custom"] as PeriodKey[]).map((key) => (
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
          <div className="flex gap-2 mt-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-7 text-xs bg-white/10 border-white/20 text-white"
            />
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-7 text-xs bg-white/10 border-white/20 text-white"
            />
          </div>
        )}
      </div>

      {/* Row: Visitas / Int. Compras / Vendas */}
      <div className="grid grid-cols-3 gap-2">
        <MetricBox label="Visitas" value={String(visitas)} />
        <MetricBox label="Int. Compras" value={String(intCompras)} />
        <MetricBox label="Vendas" value={String(metrics.vendas)} />
      </div>

      {/* Row: Unidades Vendidas / Conversão */}
      <div className="grid grid-cols-2 gap-2">
        <MetricBox label="Unid. Vendidas" value={String(metrics.unidadesVendidas)} />
        <MetricBox label="Conversão" value={`${conversao.toFixed(2)}%`} />
      </div>
    </div>
  );
}

function MetricBox({ label, value, valueColor = "text-white" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-md p-2 text-center border border-white/10">
      <p className="text-[10px] font-medium opacity-80 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
