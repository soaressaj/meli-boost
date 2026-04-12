import { useMemo } from "react";
import type { MPPayment } from "@/types/mercadopago";
import type { AdsReportDay } from "@/hooks/useMLAdsReport";
import type { VisitsFunnel } from "@/hooks/useMLVisitsReport";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  payments: MPPayment[];
  adsReport: AdsReportDay[];
  isLoading: boolean;
  adsIgnorado: boolean;
  visitsFunnel?: VisitsFunnel | null;
  allMonthPayments: MPPayment[];
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function TodayLiveMetrics({ payments, adsReport, isLoading, adsIgnorado, visitsFunnel, allMonthPayments }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();

  const metrics = useMemo(() => {
    const todayPayments = payments.filter((p) => {
      const d = (p.date_approved || p.date_created).split("T")[0];
      return d === today;
    });

    const approved = todayPayments.filter((p) => p.status === "approved");
    const cancelled = todayPayments.filter((p) => p.status === "cancelled" || p.status === "refunded");

    const faturamento = approved.reduce((s, p) => s + p.transaction_amount, 0);
    const tarifas = approved.reduce((s, p) => s + p.fee_details.reduce((fs, f) => fs + f.amount, 0), 0);
    const todayAds = adsReport.filter((a) => a.date === today).reduce((s, a) => s + a.cost, 0);
    const totalAReceber = faturamento - tarifas;
    const lucroDia = faturamento - tarifas - (adsIgnorado ? 0 : todayAds);
    const custoDia = tarifas + (adsIgnorado ? 0 : todayAds);

    // Lucro mês from all month payments
    const monthApproved = allMonthPayments.filter((p) => p.status === "approved");
    const monthFat = monthApproved.reduce((s, p) => s + p.transaction_amount, 0);
    const monthTarifas = monthApproved.reduce((s, p) => s + p.fee_details.reduce((fs, f) => fs + f.amount, 0), 0);
    const monthAds = adsReport.reduce((s, a) => s + a.cost, 0);
    const lucroMes = monthFat - monthTarifas - (adsIgnorado ? 0 : monthAds);

    return {
      faturamento,
      lucroDia,
      totalAReceber,
      custoDia,
      lucroMes,
      vendas: approved.length,
      canceladas: cancelled.length,
      unidadesVendidas: approved.length,
    };
  }, [payments, adsReport, today, adsIgnorado, allMonthPayments]);

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
        <MetricBox label="Lucro do dia" value={fmt(metrics.lucroDia)} valueColor="text-green-200" />
        <MetricBox label="Total a Receber" value={fmt(metrics.totalAReceber)} valueColor="text-green-200" />
      </div>

      {/* Row: custo dia / lucro mês */}
      <div className="grid grid-cols-2 gap-2">
        <MetricBox label="Custo do dia" value={fmt(metrics.custoDia)} valueColor="text-red-200" />
        <MetricBox label="Lucro mês" value={fmt(metrics.lucroMes)} valueColor="text-green-200" />
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
