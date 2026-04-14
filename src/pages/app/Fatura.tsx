import { useAuth } from "@/components/layout/Layout";
import { useMLAdsReport } from "@/hooks/useMLAdsReport";
import { useMLFulfillmentReport } from "@/hooks/useMLFulfillmentReport";
import { useMPPayments } from "@/hooks/useMPPayments";
import { useListingPricings } from "@/hooks/useListingPricing";
import { useMemo } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Fatura() {
  const { user } = useAuth();
  const now = new Date();

  // Fatura period: dia 18 do mês anterior até dia 17 do mês atual
  const faturaStart = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 18);
    return d;
  }, [now]);

  const faturaEnd = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 17);
    return d;
  }, [now]);

  const dateFrom = format(faturaStart, "yyyy-MM-dd");
  const dateTo = format(faturaEnd, "yyyy-MM-dd");

  const { data: payments = [] } = useMPPayments(
    { start: faturaStart, end: faturaEnd },
    user?.id
  );

  const { data: adsReport = [] } = useMLAdsReport(dateFrom, dateTo, !!user?.id);
  const { data: listingPricings = [] } = useListingPricings(user?.id);

  const summary = useMemo(() => {
    const approved = payments.filter((p) => p.status === "approved");
    const faturamento = approved.reduce((s, p) => s + p.transaction_amount, 0);

    const totalFees = approved.reduce((s, p) => {
      return s + p.fee_details.reduce((fs, f) => fs + f.amount, 0);
    }, 0);

    const totalAds = adsReport.reduce((s, a) => s + a.cost, 0);

    // Afiliados: sum from listing pricing bonus_afiliados % applied to each sale
    let totalAfiliados = 0;
    const costMap: Record<string, any> = {};
    for (const lp of listingPricings) {
      if (lp.ml_item_id) costMap[lp.ml_item_id] = lp;
      if (lp.title) costMap[lp.title.toLowerCase()] = lp;
    }
    for (const p of approved) {
      const desc = p.description?.toLowerCase();
      let pricing: any;
      if (desc) {
        for (const key of Object.keys(costMap)) {
          if (desc.includes(key) || key.includes(desc)) { pricing = costMap[key]; break; }
        }
      }
      if (pricing) {
        totalAfiliados += p.transaction_amount * ((pricing.bonus_afiliados || 0) / 100);
      }
    }

    const tarifaPagina = 99; // Valor fixo Minha Página
    const totalGastos = totalFees + totalAds + totalAfiliados + tarifaPagina;
    const sobra = faturamento - totalGastos;

    return {
      faturamento,
      totalFees,
      totalAds,
      totalAfiliados,
      tarifaPagina,
      totalGastos,
      sobra,
      vendas: approved.length,
    };
  }, [payments, adsReport, listingPricings]);

  const vencimento = format(new Date(now.getFullYear(), now.getMonth(), 23), "dd/MM/yyyy");
  const periodoLabel = `${format(faturaStart, "dd/MM", { locale: ptBR })} a ${format(faturaEnd, "dd/MM/yyyy", { locale: ptBR })}`;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fatura Mensal</h1>
        <p className="text-sm text-muted-foreground">Período: {periodoLabel} · Vencimento: {vencimento}</p>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-3 gap-4">
        <FaturaCard label="Faturamento" value={fmt(summary.faturamento)} color="text-green-400" />
        <FaturaCard label="Total Gastos" value={fmt(summary.totalGastos)} color="text-red-400" />
        <FaturaCard label="Sobra" value={fmt(summary.sobra)} color="text-blue-400" />
      </div>

      {/* Detail table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Descrição</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <Row label="Faturamento bruto" value={fmt(summary.faturamento)} positive />
            <Row label={`Tarifa de vendas (comissão + frete) — ${summary.vendas} vendas`} value={`- ${fmt(summary.totalFees)}`} />
            <Row label="Publicidade (Product Ads)" value={`- ${fmt(summary.totalAds)}`} />
            <Row label="Tarifa de afiliados" value={`- ${fmt(summary.totalAfiliados)}`} />
            <Row label="Tarifa Minha Página (fixo)" value={`- ${fmt(summary.tarifaPagina)}`} />
            <tr className="bg-muted/20 font-bold">
              <td className="px-4 py-3">Total de gastos</td>
              <td className="px-4 py-3 text-right text-red-400">{fmt(summary.totalGastos)}</td>
            </tr>
            <tr className="font-bold text-lg">
              <td className="px-4 py-3">Saldo restante</td>
              <td className={`px-4 py-3 text-right ${summary.sobra >= 0 ? "text-blue-400" : "text-red-400"}`}>
                {fmt(summary.sobra)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FaturaCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border rounded-xl p-4 text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <tr>
      <td className="px-4 py-2.5 text-muted-foreground">{label}</td>
      <td className={`px-4 py-2.5 text-right font-medium ${positive ? "text-green-400" : "text-red-300"}`}>{value}</td>
    </tr>
  );
}
