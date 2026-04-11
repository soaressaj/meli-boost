import type { MPPayment } from "@/types/mercadopago";
import type { AdsReportDay } from "@/hooks/useMLAdsReport";

interface Props {
  payments: MPPayment[];
  adsReport: AdsReportDay[];
  adsIgnorado: boolean;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function MonthSummaryBar({ payments, adsReport, adsIgnorado }: Props) {
  const approved = payments.filter((p) => p.status === "approved");
  const faturamentoMes = approved.reduce((s, p) => s + p.transaction_amount, 0);
  const gastoAdsMes = adsReport.reduce((s, a) => s + a.cost, 0);

  return (
    <div className="flex flex-wrap items-center gap-6 text-sm">
      <div>
        <span className="text-muted-foreground">Faturamento do mês: </span>
        <span className="font-bold text-foreground">{fmt(faturamentoMes)}</span>
      </div>
      {!adsIgnorado && (
        <div>
          <span className="text-muted-foreground">Gasto Ads do mês: </span>
          <span className="font-bold text-destructive">{fmt(gastoAdsMes)}</span>
        </div>
      )}
    </div>
  );
}
