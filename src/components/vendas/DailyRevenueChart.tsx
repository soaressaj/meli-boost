import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import type { MPPayment, DateRange } from "@/types/mercadopago";
import type { AdsReportDay } from "@/hooks/useMLAdsReport";
import { format, parseISO, isToday, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  payments: MPPayment[];
  isLoading: boolean;
  settings: any;
  adsReport?: AdsReportDay[];
  dateRange: DateRange;
  adsIgnorado: boolean;
}

function fmt(v: number) {
  if (v === 0) return "";
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
}

function fmtFull(v: number) {
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

export function DailyRevenueChart({ payments, isLoading, settings, adsReport = [], dateRange, adsIgnorado }: Props) {
  const chartData = useMemo(() => {
    const approved = payments.filter((p) => p.status === "approved");

    // Build ads cost lookup by date
    const adsCostByDate: Record<string, number> = {};
    adsReport.forEach((ad) => {
      adsCostByDate[ad.date] = (adsCostByDate[ad.date] || 0) + ad.cost;
    });

    // Group payments by day
    const byDay: Record<string, MPPayment[]> = {};
    approved.forEach((p) => {
      const dateStr = p.date_approved ? p.date_approved.split("T")[0] : p.date_created.split("T")[0];
      if (!byDay[dateStr]) byDay[dateStr] = [];
      byDay[dateStr].push(p);
    });

    // Generate all days in the range
    const allDays = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });

    return allDays.map((dayObj): DayData => {
      const dateStr = format(dayObj, "yyyy-MM-dd");
      const dayPayments = byDay[dateStr] || [];
      const faturamento = dayPayments.reduce((s, p) => s + p.transaction_amount, 0);
      const totalTarifas = dayPayments.reduce(
        (s, p) => s + p.fee_details.reduce((fs, f) => fs + f.amount, 0), 0
      );

      const totalVendas = dayPayments.length;
      const vendasOrganicas = totalVendas;
      const vendasAds = 0;
      const vendasAfiliados = 0;

      const custoPercent = settings?.custo_produto_percentual || 0;
      const aliquota = settings?.aliquota_imposto || 0;
      const custoFrete = settings?.custo_frete_por_pedido || 0;
      const custoProduto = faturamento * (custoPercent / 100);
      const impostos = faturamento * (aliquota / 100);
      const freteTotal = totalVendas * custoFrete;

      const gastoAds = adsCostByDate[dateStr] || 0;
      const gastoAfiliados = 0;

      // If ads_ignorado is true, don't subtract ads from profit
      const adsDeduction = adsIgnorado ? 0 : gastoAds;
      const lucro = faturamento - totalTarifas - custoProduto - impostos - freteTotal - adsDeduction - gastoAfiliados;

      const today = isToday(dayObj);

      return {
        date: dateStr,
        label: format(dayObj, "dd/MM", { locale: ptBR }),
        faturamento,
        lucro: Math.max(lucro, 0),
        gastoAds: adsIgnorado ? 0 : gastoAds,
        gastoAfiliados,
        totalVendas,
        vendasAds,
        vendasOrganicas,
        vendasAfiliados,
        isToday: today,
      };
    });
  }, [payments, settings, adsReport, dateRange, adsIgnorado]);

  if (isLoading || chartData.length === 0) {
    return null;
  }

  const barCount = chartData.length;
  const chartHeight = Math.max(320, 50);
  const showCompact = barCount > 15;

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Faturamento Diário</h2>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[hsl(var(--success))]" />
            <span className="text-muted-foreground">Lucro</span>
          </div>
          {!adsIgnorado && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[hsl(var(--destructive))]" />
              <span className="text-muted-foreground">Ads</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[hsl(var(--warning))]" />
            <span className="text-muted-foreground">Afiliados</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <div style={{ minWidth: Math.max(barCount * 48, 400), height: chartHeight }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chartData} barCategoryGap={barCount > 20 ? "8%" : "15%"}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: showCompact ? 9 : 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={barCount > 20 ? -45 : 0}
                textAnchor={barCount > 20 ? "end" : "middle"}
                height={barCount > 20 ? 50 : 30}
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
                <LabelList
                  dataKey="totalVendas"
                  position="top"
                  formatter={(v: number) => v > 0 ? `${v}` : ""}
                  style={{ fontSize: showCompact ? 8 : 10, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }}
                />
              </Bar>
              {!adsIgnorado && (
                <Bar dataKey="gastoAds" stackId="total" radius={[0, 0, 0, 0]} name="Ads">
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill="hsl(var(--destructive))"
                      opacity={entry.isToday ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              )}
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
      </div>

      {/* Daily summary cards - show last 7 or all if <= 7 */}
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
              {fmtFull(day.faturamento)}
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
          <span className="font-bold text-foreground">{fmtFull(data.faturamento)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Lucro:</span>
          <span className="font-bold text-success">{fmtFull(data.lucro)}</span>
        </div>
        {data.gastoAds > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Gasto Ads:</span>
            <span className="font-bold text-destructive">{fmtFull(data.gastoAds)}</span>
          </div>
        )}
        {data.gastoAfiliados > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Afiliados:</span>
            <span className="font-bold text-warning">{fmtFull(data.gastoAfiliados)}</span>
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
