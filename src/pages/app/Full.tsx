import { useState } from "react";
import { useMLFulfillmentReport } from "@/hooks/useMLFulfillmentReport";
import { BrazilMap } from "@/components/full/BrazilMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, MapPin, TrendingUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const PERIOD_OPTIONS = [
  { label: "Hoje", value: 1 },
  { label: "7 dias", value: 7 },
  { label: "15 dias", value: 15 },
  { label: "30 dias", value: 30 },
];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(200 80% 50%)",
  "hsl(350 70% 55%)",
  "hsl(170 60% 45%)",
];

export default function Full() {
  const [lastDays, setLastDays] = useState(30);
  const { data, isLoading, error } = useMLFulfillmentReport(lastDays);

  const selectedLabel = PERIOD_OPTIONS.find((o) => o.value === lastDays)?.label || `${lastDays} dias`;

  const chartData = (data?.centers || []).map((c) => ({
    name: `${c.city}, ${c.state}`,
    value: c.count,
    percentage: data?.total_orders ? (c.count / data.total_orders) * 100 : 0,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Fulfillment Centers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Distribuição de vendas por centro de distribuição
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {selectedLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PERIOD_OPTIONS.map((opt) => (
              <DropdownMenuItem key={opt.value} onClick={() => setLastDays(opt.value)}>
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Centros Ativos</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : data?.centers.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Envios</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : data?.total_orders || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Faturamento Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    `R$ ${(data?.centers.reduce((s, c) => s + c.revenue, 0) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brazil Map */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mapa de Centros de Distribuição</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Skeleton className="h-[350px] w-[300px] rounded-lg" />
              </div>
            ) : data?.centers.length ? (
              <BrazilMap centers={data.centers} totalOrders={data.total_orders} />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                Nenhum dado disponível para o período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Percentual de Vendas por Centro</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Skeleton className="h-[300px] w-[300px] rounded-full" />
              </div>
            ) : chartData.length ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percentage }) =>
                      `${name}: ${percentage.toFixed(1)}%`
                    }
                    labelLine
                  >
                    {chartData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} vendas`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                Nenhum dado disponível para o período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {data?.centers.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalhamento por Centro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Centro</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Vendas</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">%</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {data.centers.map((center) => (
                    <tr key={center.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium text-foreground">
                        {center.city}, {center.state}
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">{center.count}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {((center.count / data.total_orders) * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">
                        R$ {center.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
