import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import type { MPPayment } from "@/types/mercadopago";
import { format, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  payments: MPPayment[];
  isLoading: boolean;
  settings: any;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

interface DayData {
  date: string;
  label: string;
  faturamento: number;
  lucro: number;
  gastoAds: number;
  gastoAfiliados: number;
  totalVendas: number;
  vendasAds: number;
  vendasOrganicas: number;
  vendasAfiliados: number;
  isToday: boolean;
}

export function DailyRevenueChart({ payments, isLoading, settings }: Props) {
  const chartData = useMemo(() => {
    const approved = payments.filter((p) => p.status === "approved");
    if (approved.length === 0) return [];

    // Group by day
    const byDay: Record<string, MPPayment[]> = {};
    approved.forEach((p) => {
      const dateStr = p.date_approved ? p.date_approved.split("T")[0] : p.date_created.split("T")[0];
      if (!byDay[dateStr]) byDay[dateStr] = [];
      byDay[dateStr].push(p);
    });

    // Sort by date
    const sortedDays = Object.keys(byDay).sort();

    return sortedDays.map((dateStr): DayData => {
      const dayPayments = byDay[dateStr];
      const faturamento = dayPayments.reduce((s, p) => s + p.transaction_amount, 0);
      const totalTarifas = dayPayments.reduce(
        (s, p) => s + p.fee_details.reduce((fs, f) => fs + f.amount, 0), 0
      );

      // Detect channel from fee_details names in raw data
      // "ml_sale_fee" = organic, ads payments have specific markers
      // For now we estimate: if description contains "publicidad" or similar → ads
      let vendasAds = 0;
      let vendasAfiliados = 0;
      let vendasOrganicas = 0;

      dayPayments.forEach((p) => {
        // We don't have direct channel info from payments API
        // All sales count as organic for now
        vendasOrganicas++;
      });

      const totalVendas = dayPayments.length;
      const custoPercent = settings?.custo_produto_percentual || 0;
      const aliquota = settings?.aliquota_imposto || 0;
      const custoFrete = settings?.custo_frete_por_pedido || 0;
      const custoProduto = faturamento * (custoPercent / 100);
      const impostos = faturamento * (aliquota / 100);
      const freteTotal = totalVendas * custoFrete;
      const lucro = faturamento - totalTarifas - custoProduto - impostos - freteTotal;

      // Placeholder for ads/affiliates cost per day
      const gastoAds = 0;
      const gastoAfiliados = 0;

      const dateObj = parseISO(dateStr);
      const today = isToday(dateObj);

      return {
        date: dateStr,
        label: format(dateObj, "dd/MM", { locale: ptBR }),
        faturamento,
        lucro: Math.max(lucro, 0),
        gastoAds,
        gastoAfiliados,
        totalVendas,
        vendasAds,
        vendasOrganicas,
        vendasAfiliados,
        isToday: today,
      };
    });
  }, [payments, settings]);

  if (isLoading || chartData.length === 0) {
    return null;
  }

  const maxValue = Math.max(...chartData.map((d) => d.faturamento));

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Faturamento Diário</h2>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[hsl(var(--success))]" />
            <span className="text-muted-foreground">Lucro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[hsl(var(--destructive))]" />
            <span className="text-muted-foreground">Ads</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[hsl(var(--warning))]" />
            <span className="text-muted-foreground">Afiliados</span>
          </div>
        </div>
      </div>

      <div className="w-full" style={{ height: Math.max(300, 40) }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}${v >= 1000 ? 'k' : ''}`}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
            <Bar dataKey="lucro" stackId="total" radius={[0, 0, 0, 0]} name="Lucro">
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isToday ? "hsl(var(--success))" : "hsl(153 60% 45%)"}
                  opacity={entry.isToday ? 1 : 0.7}
                />
              ))}
            </Bar>
            <Bar dataKey="gastoAds" stackId="total" radius={[0, 0, 0, 0]} name="Ads">
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill="hsl(var(--destructive))"
                  opacity={entry.isToday ? 1 : 0.7}
                />
              ))}
            </Bar>
            <Bar dataKey="gastoAfiliados" stackId="total" radius={[4, 4, 0, 0]} name="Afiliados">
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill="hsl(var(--warning))"
                  opacity={entry.isToday ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily sales summary below chart */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {chartData.slice(-7).map((day) => (
          <div
            key={day.date}
            className={`text-center p-2 rounded-md border ${
              day.isToday
                ? "bg-primary/10 border-primary"
                : "bg-muted/30 border-transparent"
            }`}
          >
            <p className="text-[10px] text-muted-foreground">{day.label}</p>
            <p className={`text-xs font-bold ${day.isToday ? "text-foreground" : "text-foreground/80"}`}>
              {fmt(day.faturamento)}
            </p>
            <p className="text-[10px] text-muted-foreground">{day.totalVendas} vendas</p>
            <div className="flex justify-center gap-1 mt-1">
              <span className="text-[9px] text-success">{day.vendasOrganicas} org</span>
              {day.vendasAds > 0 && <span className="text-[9px] text-destructive">{day.vendasAds} ads</span>}
              {day.vendasAfiliados > 0 && <span className="text-[9px] text-warning">{day.vendasAfiliados} afil</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as DayData;
  if (!data) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{label} {data.isToday && "(Hoje)"}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Faturamento:</span>
          <span className="font-bold text-foreground">{fmt(data.faturamento)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Lucro:</span>
          <span className="font-bold text-success">{fmt(data.lucro)}</span>
        </div>
        {data.gastoAds > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Gasto Ads:</span>
            <span className="font-bold text-destructive">{fmt(data.gastoAds)}</span>
          </div>
        )}
        {data.gastoAfiliados > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Afiliados:</span>
            <span className="font-bold text-warning">{fmt(data.gastoAfiliados)}</span>
          </div>
        )}
        <div className="border-t pt-1 mt-1 flex justify-between gap-4">
          <span className="text-muted-foreground">Vendas:</span>
          <span className="font-medium">{data.totalVendas}</span>
        </div>
        <div className="flex gap-2 text-[10px]">
          <span className="text-success">{data.vendasOrganicas} orgânicas</span>
          {data.vendasAds > 0 && <span className="text-destructive">{data.vendasAds} ads</span>}
          {data.vendasAfiliados > 0 && <span className="text-warning">{data.vendasAfiliados} afil.</span>}
        </div>
      </div>
    </div>
  );
}
