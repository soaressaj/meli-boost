import { useState } from "react";
import type { MPPayment } from "@/types/mercadopago";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface Props {
  payments: MPPayment[];
  isLoading: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  approved: { label: "Aprovado", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "destructive" },
  rejected: { label: "Rejeitado", variant: "destructive" },
  in_process: { label: "Processando", variant: "secondary" },
};

export function SalesTable({ payments, isLoading }: Props) {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 20;

  const filtered = payments.filter((p) =>
    String(p.id).includes(filter) ||
    p.status.includes(filter.toLowerCase())
  );

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const exportCSV = () => {
    const headers = "Data/Hora,ID Pagamento,Valor Bruto,Tarifas,Valor Líquido,Status\n";
    const rows = payments.map((p) => {
      const tarifas = p.fee_details.reduce((s, f) => s + f.amount, 0);
      const liquido = p.transaction_details?.net_received_amount ?? (p.transaction_amount - tarifas);
      return `${p.date_approved || p.date_created},${p.id},${p.transaction_amount},${tarifas},${liquido},${p.status}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "vendas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por ID ou status..."
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Data/Hora</th>
              <th className="text-left p-3 font-medium text-muted-foreground">ID Pagamento</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Valor Bruto</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Tarifas</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Valor Líquido</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Nenhuma venda encontrada
                </td>
              </tr>
            ) : (
              paged.map((p) => {
                const tarifas = p.fee_details.reduce((s, f) => s + f.amount, 0);
                const liquido = p.transaction_details?.net_received_amount ?? (p.transaction_amount - tarifas);
                const sc = statusConfig[p.status] || statusConfig.pending;
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3">{format(new Date(p.date_approved || p.date_created), "dd/MM/yy HH:mm")}</td>
                    <td className="p-3 font-mono text-xs">{p.id}</td>
                    <td className="p-3 text-right">{formatCurrency(p.transaction_amount)}</td>
                    <td className="p-3 text-right text-warning">{formatCurrency(tarifas)}</td>
                    <td className="p-3 text-right text-success font-medium">{formatCurrency(liquido)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t">
          <span className="text-xs text-muted-foreground">
            {filtered.length} resultado(s) — Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
