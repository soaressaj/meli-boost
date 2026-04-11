import type { MPPayment } from "@/types/mercadopago";
import type { AdsReportDay } from "@/hooks/useMLAdsReport";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

interface Props {
  payments: MPPayment[];
  adsReport: AdsReportDay[];
  isLoading: boolean;
  adsIgnorado: boolean;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function TodayLiveMetrics({ payments, adsReport, isLoading, adsIgnorado }: Props) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const todayPayments = payments.filter((p) => {
    const d = (p.date_approved || p.date_created).split("T")[0];
    return d === today;
  });

  const approved = todayPayments.filter((p) => p.status === "approved");
  const cancelled = todayPayments.filter((p) => p.status === "cancelled" || p.status === "refunded");

  const faturamento = approved.reduce((s, p) => s + p.transaction_amount, 0);
  const tarifas = approved.reduce((s, p) => s + p.fee_details.reduce((fs, f) => fs + f.amount, 0), 0);

  const todayAds = adsReport
    .filter((a) => a.date === today)
    .reduce((s, a) => s + a.cost, 0);

  const lucro = faturamento - tarifas - (adsIgnorado ? 0 : todayAds);

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Vendas ao Vivo — Hoje</h2>
        <span className="ml-auto text-xs text-muted-foreground animate-pulse">● Atualizado</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-3 rounded-md bg-muted/30">
          <p className="text-xs text-muted-foreground">Faturamento</p>
          <p className="text-xl font-bold text-foreground">{fmt(faturamento)}</p>
        </div>
        <div className="text-center p-3 rounded-md bg-muted/30">
          <p className="text-xs text-muted-foreground">Lucro</p>
          <p className="text-xl font-bold text-success">{fmt(lucro)}</p>
        </div>
        <div className="text-center p-3 rounded-md bg-muted/30">
          <p className="text-xs text-muted-foreground">Vendas</p>
          <p className="text-xl font-bold text-foreground">{approved.length}</p>
        </div>
        <div className="text-center p-3 rounded-md bg-muted/30">
          <p className="text-xs text-muted-foreground">Canceladas</p>
          <p className="text-xl font-bold text-destructive">{cancelled.length}</p>
        </div>
      </div>
    </div>
  );
}
