import type { MPPayment } from "@/types/mercadopago";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  payments: MPPayment[];
  isLoading: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function FaturamentoHeader({ payments, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-36" />
      </div>
    );
  }

  const approved = payments.filter((p) => p.status === "approved");
  const totalBruto = approved.reduce((sum, p) => sum + p.transaction_amount, 0);
  const totalTarifas = approved.reduce(
    (sum, p) => sum + p.fee_details.reduce((s, f) => s + f.amount, 0), 0
  );
  const lucro = totalBruto - totalTarifas;

  return (
    <div>
      <p className="text-sm text-muted-foreground">Faturamento</p>
      <p className="text-3xl font-bold text-foreground">{formatCurrency(totalBruto)}</p>
      <p className="text-sm text-muted-foreground mt-1">Lucro</p>
      <p className="text-2xl font-bold text-success">{formatCurrency(lucro)}</p>
    </div>
  );
}
