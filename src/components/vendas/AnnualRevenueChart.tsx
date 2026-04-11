import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import type { MPPayment } from "@/types/mercadopago";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  payments: MPPayment[];
}

function fmtFull(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function AnnualRevenueChart({ payments }: Props) {
  const now = new Date();

  const chartData = useMemo(() => {
    const approved = payments.filter((p) => p.status === "approved");

    // Last 12 months including current
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(now, 11 - i);
      return {
        key: format(date, "yyyy-MM"),
        label: format(date, "MMM", { locale: ptBR }),
        isCurrent: format(date, "yyyy-MM") === format(now, "yyyy-MM"),
      };
    });

    const byMonth: Record<string, number> = {};
    approved.forEach((p) => {
      const m = (p.date_approved || p.date_created).substring(0, 7);
      byMonth[m] = (byMonth[m] || 0) + p.transaction_amount;
    });

    return months.map((m) => ({
      ...m,
      faturamento: byMonth[m.key] || 0,
    }));
  }, [payments, now]);

  const totalAnual = chartData.reduce((s, d) => s + d.faturamento, 0);

  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Faturamento Anual</h2>
        <span className="text-xs text-muted-foreground">
          Total: <strong className="text-foreground">{fmtFull(totalAnual)}</strong>
        </span>
      </div>

      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
                    <p className="font-semibold capitalize">{d.label} {d.isCurrent && "(Atual)"}</p>
                    <p>Faturamento: <strong>{fmtFull(d.faturamento)}</strong></p>
                  </div>
                );
              }}
              cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
            />
            <Bar dataKey="faturamento" radius={[3, 3, 0, 0]}>
              <LabelList
                dataKey="faturamento"
                position="top"
                formatter={(v: number) => v > 0 ? `${(v / 1000).toFixed(1)}k` : ""}
                style={{ fontSize: 8, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }}
              />
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isCurrent ? "hsl(var(--success))" : "hsl(153 60% 50% / 0.6)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
