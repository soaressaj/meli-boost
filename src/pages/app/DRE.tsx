import { useAuth } from "@/components/layout/Layout";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useMPPayments } from "@/hooks/useMPPayments";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function DRE() {
  const { user } = useAuth();
  const { settings } = useUserSettings(user?.id);

  // Last 12 months date range
  const now = new Date();
  const startDate = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const { data: payments = [], isLoading } = useMPPayments({ start: startDate, end: endDate }, user?.id);

  // Group by month
  const monthlyData: Record<string, { bruto: number; tarifas: number; count: number }> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const key = `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
    monthlyData[key] = { bruto: 0, tarifas: 0, count: 0 };
  }

  payments.forEach((p) => {
    const d = new Date(p.date_approved || p.date_created);
    const key = `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
    if (monthlyData[key]) {
      monthlyData[key].bruto += p.transaction_amount;
      monthlyData[key].tarifas += p.fee_details.reduce((s, f) => s + f.amount, 0);
      monthlyData[key].count += 1;
    }
  });

  const aliquota = Number(settings?.aliquota_imposto) || 0;
  const custoFixo = Number(settings?.custo_fixo_mensal) || 0;
  const custoFrete = Number(settings?.custo_frete_por_pedido) || 0;
  const custoProdPct = Number(settings?.custo_produto_percentual) || 0;

  const months = Object.keys(monthlyData);
  const chartData = months.map((m) => {
    const d = monthlyData[m];
    const impostos = d.bruto * (aliquota / 100);
    const frete = custoFrete * d.count;
    const custoProd = d.bruto * (custoProdPct / 100);
    const lucro = d.bruto - d.tarifas - impostos - frete - custoFixo - custoProd;
    return { month: m, faturamento: d.bruto, lucro };
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold">DRE</h1>
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">DRE — Demonstrativo de Resultados</h1>

      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-muted/30">Linha</th>
              {months.map((m) => (
                <th key={m} className="text-right p-3 font-medium text-muted-foreground whitespace-nowrap">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="(+) Faturamento Bruto" values={months.map((m) => monthlyData[m].bruto)} />
            <Row label="(-) Tarifas MP" values={months.map((m) => monthlyData[m].tarifas)} negative />
            <Row label="(-) Impostos" values={months.map((m) => monthlyData[m].bruto * (aliquota / 100))} negative />
            <Row label="(-) Frete" values={months.map((m) => custoFrete * monthlyData[m].count)} negative />
            <Row label="(-) Custos fixos" values={months.map(() => custoFixo)} negative />
            <Row label="(-) Custo produtos" values={months.map((m) => monthlyData[m].bruto * (custoProdPct / 100))} negative />
            <tr className="border-t-2 bg-muted/20 font-bold">
              <td className="p-3 text-success sticky left-0 bg-muted/20">(=) LUCRO LÍQUIDO</td>
              {chartData.map((d) => (
                <td key={d.month} className="p-3 text-right text-success">{formatCurrency(d.lucro)}</td>
              ))}
            </tr>
            <tr>
              <td className="p-3 text-muted-foreground sticky left-0">Margem (%)</td>
              {chartData.map((d) => (
                <td key={d.month} className="p-3 text-right text-muted-foreground">
                  {d.faturamento > 0 ? ((d.lucro / d.faturamento) * 100).toFixed(1) : "0.0"}%
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Faturamento vs Lucro</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="faturamento" name="Faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Row({ label, values, negative }: { label: string; values: number[]; negative?: boolean }) {
  return (
    <tr className="border-b hover:bg-muted/10">
      <td className="p-3 text-foreground sticky left-0 bg-card">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`p-3 text-right ${negative ? "text-warning" : "text-foreground"}`}>
          {formatCurrency(v)}
        </td>
      ))}
    </tr>
  );
}
