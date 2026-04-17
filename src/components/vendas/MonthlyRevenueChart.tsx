import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import type { MPPayment } from "@/types/mercadopago";
import type { AdsReportDay } from "@/hooks/useMLAdsReport";
import type { ListingPricing } from "@/hooks/useListingPricing";
import { format, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  payments: MPPayment[];
  adsReport?: AdsReportDay[];
  adsIgnorado: boolean;
  listingPricings?: ListingPricing[];
}

function fmtFull(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function buildCostMap(pricings: ListingPricing[]) {
  const map: Record<string, ListingPricing> = {};
  for (const lp of pricings) {
    if (lp.ml_item_id) map[lp.ml_item_id] = lp;
    if (lp.title) map[lp.title.toLowerCase()] = lp;
  }
  return map;
}

function findPricing(payment: MPPayment, costMap: Record<string, ListingPricing>): ListingPricing | undefined {
  const desc = payment.description?.toLowerCase();
  if (desc) {
    for (const key of Object.keys(costMap)) {
      if (desc.includes(key) || key.includes(desc)) return costMap[key];
    }
  }
  return undefined;
}

function getQty(p: MPPayment): number {
  const items = p.additional_info?.items;
  if (items && items.length > 0) {
    const t = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    if (t > 0) return t;
  }
  return 1;
}

export function MonthlyRevenueChart({ payments, adsReport = [], adsIgnorado, listingPricings = [] }: Props) {
  const now = new Date();
  const monthName = format(now, "MMMM", { locale: ptBR });
  const daysInMonth = getDaysInMonth(now);
  const costMap = useMemo(() => buildCostMap(listingPricings), [listingPricings]);

  const { chartData, totalFat } = useMemo(() => {
    const approved = payments.filter((p) => p.status === "approved");

    const adsCostByDate: Record<string, number> = {};
    adsReport.forEach((ad) => {
      adsCostByDate[ad.date] = (adsCostByDate[ad.date] || 0) + ad.cost;
    });

    // Group payments by day
    const byDay: Record<string, MPPayment[]> = {};
    approved.forEach((p) => {
      const dateStr = (p.date_approved || p.date_created).split("T")[0];
      if (!byDay[dateStr]) byDay[dateStr] = [];
      byDay[dateStr].push(p);
    });

    let totalFat = 0;
    const year = now.getFullYear();
    const month = now.getMonth();
    const currentDay = now.getDate();

    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = format(new Date(year, month, day), "yyyy-MM-dd");
      const dayPayments = byDay[dateStr] || [];
      const isFuture = day > currentDay;

      if (isFuture) {
        return { day: String(day), faturamento: 0, lucro: 0, custoML: 0, ads: 0, afiliados: 0, vendas: 0, isFuture: true };
      }

      const fat = dayPayments.reduce((s, p) => s + p.transaction_amount, 0);
      totalFat += fat;
      const count = dayPayments.length;

      // Calculate cost breakdown (per unidade)
      let totalFees = 0;
      let totalCustoProduto = 0;
      let totalImposto = 0;
      let totalEtiqueta = 0;
      let totalTransporte = 0;
      let totalEmbalagem = 0;
      let totalAfiliados = 0;

      for (const p of dayPayments) {
        const fees = p.fee_details.reduce((s, f) => s + f.amount, 0);
        totalFees += fees;

        const pricing = findPricing(p, costMap);
        if (pricing) {
          const qty = getQty(p);
          const unidades = qty * (pricing.qtd_kit || 1);
          totalCustoProduto += (pricing.custo_produto || 0) * unidades;
          totalEmbalagem += (pricing.embalagem || 0) * qty;
          totalTransporte += (pricing.transporte || 0) * qty;
          totalEtiqueta += (pricing.etiqueta || 0) * qty;
          totalAfiliados += p.transaction_amount * ((pricing.bonus_afiliados || 0) / 100);
          totalImposto += p.transaction_amount * ((pricing.diferenca_icms || 0) / 100);
        }
      }

      const adsDay = adsCostByDate[dateStr] || 0;
      const custoML = totalFees;
      const custosProduto = totalCustoProduto + totalEmbalagem + totalTransporte + totalEtiqueta + totalImposto;
      const lucro = fat - custoML - custosProduto - totalAfiliados - (adsIgnorado ? 0 : adsDay);

      return {
        day: String(day),
        faturamento: fat,
        lucro: Math.max(lucro, 0),
        custoML,
        ads: adsIgnorado ? 0 : adsDay,
        afiliados: totalAfiliados,
        vendas: count,
        isFuture: false,
      };
    });

    return { chartData: data, totalFat };
  }, [payments, adsReport, adsIgnorado, daysInMonth, costMap, now]);

  const fmtCompact = (v: number) => {
    if (v <= 0) return "";
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v.toFixed(0);
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground capitalize">
          Faturamento {monthName}
        </h2>
        <span className="text-xs text-muted-foreground">Total: <strong className="text-foreground">{fmtFull(totalFat)}</strong></span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /> Lucro</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#eab308]" /> Custo ML</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ec4899]" /> Ads</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]" /> Afiliados</span>
        <span className="flex items-center gap-1 ml-auto text-muted-foreground">
          <span className="text-green-500 font-semibold">F</span>=Faturamento ·
          <span className="text-blue-500 font-semibold ml-1">L</span>=Lucro
        </span>
      </div>

      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="15%" stackOffset="none" margin={{ top: 24, right: 4, bottom: 28, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="day"
              tick={(props) => {
                const { x, y, payload, index } = props;
                const d = chartData[index];
                if (!d || d.isFuture) {
                  return (
                    <text x={x} y={y + 12} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))" opacity={0.4}>
                      {payload.value}
                    </text>
                  );
                }
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text y={10} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))" fontWeight={600}>
                      {payload.value}
                    </text>
                    {d.faturamento > 0 && (
                      <text y={22} textAnchor="middle" fontSize={8} fill="hsl(142, 71%, 45%)" fontWeight={700}>
                        F:{fmtCompact(d.faturamento)}
                      </text>
                    )}
                    {d.lucro > 0 && (
                      <text y={32} textAnchor="middle" fontSize={8} fill="hsl(217, 91%, 60%)" fontWeight={700}>
                        L:{fmtCompact(d.lucro)}
                      </text>
                    )}
                  </g>
                );
              }}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={42}
            />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d || d.isFuture) return null;
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-2.5 text-xs space-y-1">
                    <p className="font-semibold">Dia {d.day}</p>
                    <p>Faturamento: <strong className="text-green-400">{fmtFull(d.faturamento)}</strong></p>
                    <p>Lucro {adsIgnorado ? "(s/ ads)" : "(c/ ads)"}: <strong className="text-blue-400">{fmtFull(d.lucro)}</strong></p>
                    <p>Custo ML: <strong className="text-yellow-400">{fmtFull(d.custoML)}</strong></p>
                    <p>Ads: <strong className="text-pink-400">{fmtFull(d.ads)}</strong></p>
                    <p>Afiliados: <strong className="text-orange-400">{fmtFull(d.afiliados)}</strong></p>
                    <p>Vendas: <strong>{d.vendas}</strong></p>
                  </div>
                );
              }}
              cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
            />
            <Bar dataKey="lucro" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="custoML" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
            <Bar dataKey="ads" stackId="a" fill="#ec4899" radius={[0, 0, 0, 0]} />
            <Bar dataKey="afiliados" stackId="a" fill="#f97316" radius={[2, 2, 0, 0]}>
              <LabelList
                dataKey="vendas"
                position="top"
                formatter={(v: number) => v > 0 ? `${v}` : ""}
                style={{ fontSize: 10, fill: "hsl(153,100%,40%)", fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
