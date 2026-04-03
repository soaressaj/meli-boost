import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { VisitsFunnel } from "@/hooks/useMLVisitsReport";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface ConversionFunnelProps {
  data: VisitsFunnel | undefined;
  isLoading: boolean;
}

export function ConversionFunnel({ data, isLoading }: ConversionFunnelProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-48 w-full" />
      </Card>
    );
  }

  if (!data || data.total_visits === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Conversão de visitas</h2>
        <p className="text-muted-foreground text-sm text-center py-16">
          Nenhum dado de visitas encontrado para este período.
        </p>
      </Card>
    );
  }

  const { total_visits, purchase_intent, purchase_intent_amount, completed_sales, completed_sales_amount, conversion_rate } = data;

  // Conversion rates between stages
  const visitToIntent = total_visits > 0 ? ((purchase_intent / total_visits) * 100).toFixed(1) : "0";
  const intentToSale = purchase_intent > 0 ? ((completed_sales / purchase_intent) * 100).toFixed(1) : "0";

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Conversão de visitas</h2>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-foreground">{conversion_rate.toFixed(1)}%</span>
          <span className="text-sm text-muted-foreground">Conversão total</span>
        </div>
      </div>

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

          {/* Funnel shape - wide on left, narrows in middle, widens slightly on right */}
          <path
            d={`M 0,10 
                C 100,10 200,${90 - (purchase_intent / Math.max(total_visits, 1)) * 40} 300,${90 - (purchase_intent / Math.max(total_visits, 1)) * 30}
                C 400,${90 - (purchase_intent / Math.max(total_visits, 1)) * 20} 500,${90 - (completed_sales / Math.max(total_visits, 1)) * 40} 600,${90 - (completed_sales / Math.max(total_visits, 1)) * 30}
                C 700,${90 - (completed_sales / Math.max(total_visits, 1)) * 20} 800,20 900,15
                L 900,165
                C 800,160 700,${90 + (completed_sales / Math.max(total_visits, 1)) * 20} 600,${90 + (completed_sales / Math.max(total_visits, 1)) * 30}
                C 500,${90 + (completed_sales / Math.max(total_visits, 1)) * 40} 400,${90 + (purchase_intent / Math.max(total_visits, 1)) * 20} 300,${90 + (purchase_intent / Math.max(total_visits, 1)) * 30}
                C 200,${90 + (purchase_intent / Math.max(total_visits, 1)) * 40} 100,170 0,170
                Z`}
            fill="url(#funnelGrad)"
          />

          {/* Divider lines */}
          <line x1="300" y1="0" x2="300" y2="180" stroke="hsl(var(--border))" strokeDasharray="4 4" strokeWidth="1" />
          <line x1="600" y1="0" x2="600" y2="180" stroke="hsl(var(--border))" strokeDasharray="4 4" strokeWidth="1" />

          {/* Conversion rate labels */}
          <rect x="270" y="8" width="60" height="22" rx="4" fill="hsl(var(--primary))" opacity="0.1" />
          <text x="300" y="23" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--primary))">
            {visitToIntent}%
          </text>

          <rect x="570" y="8" width="60" height="22" rx="4" fill="hsl(var(--primary))" opacity="0.1" />
          <text x="600" y="23" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--primary))">
            {intentToSale}%
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
    </Card>
  );
}
