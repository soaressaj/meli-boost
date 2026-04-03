import type { MPPayment } from "@/types/mercadopago";
import type { UserSettings } from "@/types/mercadopago";
import { ShoppingCart, Tag, DollarSign, XCircle, Wallet, FileText, Landmark, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  payments: MPPayment[];
  settings: UserSettings | null;
  isLoading: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function KPICards({ payments, settings, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg p-4 shadow-sm border">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const approved = payments.filter((p) => p.status === "approved");
  const cancelled = payments.filter((p) => p.status === "cancelled" || p.status === "refunded");

  const totalBruto = approved.reduce((sum, p) => sum + p.transaction_amount, 0);
  const totalUnits = approved.length;
  const totalTarifas = approved.reduce(
    (sum, p) => sum + p.fee_details.reduce((s, f) => s + f.amount, 0), 0
  );
  const totalLiquido = totalBruto - totalTarifas;

  const ticketMedio = totalUnits > 0 ? totalBruto / totalUnits : 0;
  const lucroMedio = totalUnits > 0 ? totalLiquido / totalUnits : 0;
  const cancelledValue = cancelled.reduce((sum, p) => sum + p.transaction_amount, 0);

  const aliquota = settings?.aliquota_imposto ?? 0;
  const impostos = totalBruto * (aliquota / 100);
  const custoFrete = (settings?.custo_frete_por_pedido ?? 0) * totalUnits;
  const custoProduto = totalBruto * ((settings?.custo_produto_percentual ?? 0) / 100);

  const row1 = [
    { icon: ShoppingCart, label: "Vendas", value: String(totalUnits), sub: `${totalUnits} unidades`, color: "text-foreground" },
    { icon: Tag, label: "Ticket Médio", value: formatCurrency(ticketMedio), color: "text-foreground" },
    { icon: DollarSign, label: "Lucro Médio", value: formatCurrency(lucroMedio), color: "text-success" },
    { icon: XCircle, label: "Canceladas", value: String(cancelled.length), sub: formatCurrency(cancelledValue), color: "text-destructive" },
  ];

  const row2 = [
    { icon: Wallet, label: "Custos", value: formatCurrency(custoProduto), color: "text-warning" },
    { icon: FileText, label: "Tarifas", value: formatCurrency(totalTarifas), color: "text-warning" },
    { icon: Landmark, label: "Impostos", value: formatCurrency(impostos), color: "text-warning" },
    { icon: Truck, label: "Frete", value: formatCurrency(custoFrete), color: "text-warning" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {row1.map((card) => (
          <div key={card.label} className="bg-card rounded-lg p-4 shadow-sm border animate-fade-in">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <card.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{card.label}</span>
            </div>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            {card.sub && <p className="text-xs text-muted-foreground">{card.sub}</p>}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {row2.map((card) => (
          <div key={card.label} className="bg-card rounded-lg p-4 shadow-sm border animate-fade-in">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <card.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{card.label}</span>
            </div>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
