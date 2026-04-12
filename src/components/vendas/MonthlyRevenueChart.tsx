import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import type { MPPayment } from "@/types/mercadopago";
import type { AdsReportDay } from "@/hooks/useMLAdsReport";
import { format, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  payments: MPPayment[];
  adsReport?: AdsReportDay[];
  adsIgnorado: boolean;
}

function fmtFull(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function MonthlyRevenueChart({ payments, adsReport = [], adsIgnorado }: Props) {
  const now = new Date();
  const monthName = format(now, "MMMM", { locale: ptBR });
  const daysInMonth = getDaysInMonth(now);

  const { chartData, totalFat, totalAds } = useMemo(() => {
    const approved = payments.filter((p) => p.status === "approved");

    const adsCostByDate: Record<string, number> = {};
    adsReport.forEach((ad) => {
      adsCostByDate[ad.date] = (adsCostByDate[ad.date] || 0) + ad.cost;
    });

    const byDay: Record<string, { fat: number; count: number }> = {};
    approved.forEach((p) => {
      const dateStr = (p.date_approved || p.date_created).split("T")[0];
      if (!byDay[dateStr]) byDay[dateStr] = { fat: 0, count: 0 };
      byDay[dateStr].fat += p.transaction_amount;
      byDay[dateStr].count += 1;
    });

    let totalFat = 0;
    let totalAds = 0;

    const year = now.getFullYear();
    const month = now.getMonth();
    const currentDay = now.getDate();

    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = format(new Date(year, month, day), "yyyy-MM-dd");
      const dayData = byDay[dateStr];
      const fat = day <= currentDay ? (dayData?.fat || 0) : 0;
      const count = day <= currentDay ? (dayData?.count || 0) : 0;
      const ads = day <= currentDay ? (adsCostByDate[dateStr] || 0) : 0;
      totalFat += fat;
      totalAds += ads;

      return {
        day: String(day),
        faturamento: fat,
        vendas: count,
        isFuture: day > currentDay,
        isToday: day === currentDay,
      };
    });

    return { chartData: data, totalFat, totalAds };
  }, [payments, adsReport, daysInMonth, now]);

  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground capitalize">
          Faturamento {monthName}
        </h2>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>Total: <strong className="text-foreground">{fmtFull(totalFat)}</strong></span>
          {!adsIgnorado && <span>Ads: <strong className="text-destructive">{fmtFull(totalAds)}</strong></span>}
        </div>
      </div>

      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
                    <p className="font-semibold">Dia {d.day} {d.isToday && "(Hoje)"}</p>
                    <p>Faturamento: <strong>{fmtFull(d.faturamento)}</strong></p>
                    <p>Vendas: <strong>{d.vendas}</strong></p>
                  </div>
                );
              }}
              cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
            />
            <Bar dataKey="faturamento" radius={[2, 2, 0, 0]}>
              <LabelList
                dataKey="vendas"
                position="top"
                formatter={(v: number) => v > 0 ? `${v}` : ""}
                style={{ fontSize: 10, fill: "hsl(153,100%,30%)", fontWeight: 700 }}
              />
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isFuture ? "hsl(var(--muted))" : entry.isToday ? "hsl(var(--success))" : "hsl(153 60% 50% / 0.7)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
