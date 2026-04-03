import { useAuth } from "@/components/layout/Layout";
import { useMLAdsReport } from "@/hooks/useMLAdsReport";
import { useMLVisitsReport } from "@/hooks/useMLVisitsReport";
import { ConversionFunnel } from "@/components/ads/ConversionFunnel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, TrendingUp, MousePointerClick, Eye } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { useMemo } from "react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
  };
}

function getLast3MonthsRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
  };
}

const monthNames = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export default function Marketplaces() {
  const { user } = useAuth();

  const currentMonth = getMonthRange();
  const last3Months = getLast3MonthsRange();

  const { data: dailyData, isLoading: dailyLoading } = useMLAdsReport(
    currentMonth.from,
    currentMonth.to,
    !!user
  );

  const { data: monthlyRaw, isLoading: monthlyLoading } = useMLAdsReport(
    last3Months.from,
    last3Months.to,
    !!user
  );

  const today = new Date().toISOString().split("T")[0];
  const todaySpend = dailyData?.find((d) => d.date === today)?.cost ?? 0;
  const todayClicks = dailyData?.find((d) => d.date === today)?.clicks ?? 0;
  const todayImpressions = dailyData?.find((d) => d.date === today)?.prints ?? 0;
  const monthTotal = dailyData?.reduce((sum, d) => sum + d.cost, 0) ?? 0;

  const dailyChart = useMemo(() => {
    if (!dailyData) return [];
    return dailyData.map((d) => ({
      day: new Date(d.date + "T12:00:00").getDate().toString(),
      valor: d.cost,
    }));
  }, [dailyData]);

  const monthlyChart = useMemo(() => {
    if (!monthlyRaw) return [];
    const grouped: Record<string, number> = {};
    monthlyRaw.forEach((d) => {
      const dt = new Date(d.date + "T12:00:00");
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      grouped[key] = (grouped[key] || 0) + d.cost;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, valor]) => {
        const [, m] = key.split("-");
        return { mes: monthNames[parseInt(m, 10) - 1], valor };
      });
  }, [monthlyRaw]);

  const isLoading = dailyLoading || monthlyLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">ADS - Mercado Livre</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Megaphone}
          label="Gasto Hoje"
          value={formatCurrency(todaySpend)}
          highlight
          isLoading={isLoading}
        />
        <KPICard
          icon={TrendingUp}
          label="Gasto no Mês"
          value={formatCurrency(monthTotal)}
          isLoading={isLoading}
        />
        <KPICard
          icon={MousePointerClick}
          label="Cliques Hoje"
          value={todayClicks.toLocaleString("pt-BR")}
          isLoading={isLoading}
        />
        <KPICard
          icon={Eye}
          label="Impressões Hoje"
          value={todayImpressions.toLocaleString("pt-BR")}
          isLoading={isLoading}
        />
      </div>

      {/* Daily chart */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Gasto diário com ADS — {monthNames[new Date().getMonth()]}
        </h2>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : dailyChart.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-16">
            Nenhum dado de ADS encontrado para este mês.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tickFormatter={(v) => `R$${v}`}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Gasto"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="valor" position="top" formatter={(v: number) => `R$${v.toFixed(0)}`} style={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Monthly chart */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Gasto mensal com ADS — Últimos 3 meses
        </h2>
        {monthlyLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : monthlyChart.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-16">
            Nenhum dado de ADS encontrado para os últimos meses.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tickFormatter={(v) => `R$${v}`}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Gasto"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="valor" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="valor" position="top" formatter={(v: number) => formatCurrency(v)} style={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  highlight,
  isLoading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
  isLoading?: boolean;
}) {
  return (
    <Card className={`p-5 ${highlight ? "border-primary bg-primary/5" : ""}`}>
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="h-6 w-24 mt-1" />
          ) : (
            <p className={`text-lg font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
              {value}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
