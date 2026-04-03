import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMLVisitsReport } from "@/hooks/useMLVisitsReport";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateBR(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
}

type PeriodKey = "today" | "7days" | "15days" | "30days";

interface PeriodOption {
  key: PeriodKey;
  label: string;
  days: number;
}

const PERIODS: PeriodOption[] = [
  { key: "today", label: "Hoje", days: 1 },
  { key: "7days", label: "Últimos 7 dias", days: 7 },
  { key: "15days", label: "Últimos 15 dias", days: 15 },
  { key: "30days", label: "Últimos 30 dias", days: 30 },
];

function getDateRange(days: number) {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  return {
    from: start.toISOString().split("T")[0],
    to: end,
    startDate: start,
    endDate: now,
  };
}

interface ConversionFunnelProps {
  enabled: boolean;
}

export function ConversionFunnel({ enabled }: ConversionFunnelProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("today");

  const period = PERIODS.find((p) => p.key === selectedPeriod)!;
  const range = useMemo(() => getDateRange(period.days), [period.days]);

  const { data, isLoading } = useMLVisitsReport(range.from, range.to, period.days, enabled);

  const subtitle = period.key === "today"
    ? formatDateBR(range.endDate)
    : `${formatDateBR(range.startDate)} a ${formatDateBR(range.endDate)}`;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-48 w-full" />
      </Card>
    );
  }

  const hasData = data && data.total_visits > 0;

  const { total_visits = 0, purchase_intent = 0, purchase_intent_amount = 0, completed_sales = 0, completed_sales_amount = 0, conversion_rate = 0 } = data ?? {};

  const visitToIntent = total_visits > 0 ? ((purchase_intent / total_visits) * 100) : 0;
  const intentToSale = purchase_intent > 0 ? ((completed_sales / purchase_intent) * 100) : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Conversão de visitas</h2>
          {hasData && (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">{Number.isInteger(conversion_rate) ? conversion_rate : conversion_rate.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground">Conversão total</span>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {period.label}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {PERIODS.map((p) => {
              const r = getDateRange(p.days);
              const sub = p.key === "today"
                ? formatDateBR(r.endDate)
                : `${formatDateBR(r.startDate)} a ${formatDateBR(r.endDate)}`;
              return (
                <DropdownMenuItem
                  key={p.key}
                  onClick={() => setSelectedPeriod(p.key)}
                  className={`flex flex-col items-start gap-0.5 ${selectedPeriod === p.key ? "font-bold text-primary" : ""}`}
                >
                  <span>{p.label}</span>
                  <span className="text-xs text-muted-foreground">{sub}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!hasData ? (
        <p className="text-muted-foreground text-sm text-center py-16">
          Nenhum dado de visitas encontrado para este período.
        </p>
      ) : (
        <>
          {/* Funnel visualization */}
          <div className="relative h-44 mb-6">
            <svg viewBox="0 0 900 180" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Funnel shape */}
              {(() => {
                const intentRatio = Math.min(purchase_intent / Math.max(total_visits, 1), 1);
                const salesRatio = Math.min(completed_sales / Math.max(total_visits, 1), 1);
                const topNarrow = 90 - intentRatio * 40;
                const botWide = 90 + intentRatio * 40;
                const topRight = 90 - salesRatio * 30;
                const botRight = 90 + salesRatio * 30;
                return (
                  <path
                    d={`M 0,10 C 100,10 200,${topNarrow} 300,${topNarrow} C 400,${topNarrow} 500,${topRight} 600,${topRight} C 700,${topRight} 800,20 900,15 L 900,165 C 800,160 700,${botRight} 600,${botRight} C 500,${botRight} 400,${botWide} 300,${botWide} C 200,${botWide} 100,170 0,170 Z`}
                    fill="url(#funnelGrad)"
                  />
                );
              })()}

              {/* Divider lines */}
              <line x1="300" y1="0" x2="300" y2="180" stroke="hsl(var(--border))" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="600" y1="0" x2="600" y2="180" stroke="hsl(var(--border))" strokeDasharray="4 4" strokeWidth="1" />

              {/* Conversion rate labels */}
              <rect x="270" y="8" width="60" height="22" rx="4" fill="hsl(var(--primary))" opacity="0.1" />
              <text x="300" y="23" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--primary))">
                {Number.isInteger(visitToIntent) ? visitToIntent : visitToIntent.toFixed(1)}%
              </text>

              <rect x="570" y="8" width="60" height="22" rx="4" fill="hsl(var(--primary))" opacity="0.1" />
              <text x="600" y="23" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--primary))">
                {Number.isInteger(intentToSale) ? intentToSale : intentToSale.toFixed(1)}%
              </text>
            </svg>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 border-t pt-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Visitas únicas</p>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary/60" />
                <span className="text-lg font-bold text-foreground">{total_visits.toLocaleString("pt-BR")}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Intenção de compra</p>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary/40" />
                <span className="text-lg font-bold text-foreground">
                  {purchase_intent.toLocaleString("pt-BR")}{" "}
                  <span className="text-sm font-normal text-muted-foreground">({formatCurrency(purchase_intent_amount)})</span>
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Vendas brutas</p>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary/80" />
                <span className="text-lg font-bold text-foreground">
                  {completed_sales.toLocaleString("pt-BR")}{" "}
                  <span className="text-sm font-normal text-muted-foreground">({formatCurrency(completed_sales_amount)})</span>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
