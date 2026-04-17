import { useMemo } from "react";
import type { MPPayment } from "@/types/mercadopago";
import type { ListingPricing } from "@/hooks/useListingPricing";
import type { MLItem } from "@/hooks/useMLActiveItems";

interface Props {
  payments: MPPayment[];
  listingPricings?: ListingPricing[];
  activeItems?: MLItem[];
  limit?: number;
}

interface Aggregated {
  key: string;
  title: string;
  thumbnail: string | null;
  faturamento: number;
  unidades: number;
  pedidos: number;
  estoque: number | null;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function getQty(p: MPPayment): number {
  const items = p.additional_info?.items;
  if (items && items.length > 0) {
    const t = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    if (t > 0) return t;
  }
  return 1;
}

function getItemId(p: MPPayment): string | undefined {
  const items = p.additional_info?.items;
  return items?.[0]?.id;
}

function getItemTitle(p: MPPayment): string {
  return (
    p.additional_info?.items?.[0]?.title ||
    p.description ||
    "Produto sem título"
  );
}

export function TopSellingProducts({ payments, listingPricings = [], activeItems = [], limit = 5 }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const top = useMemo<Aggregated[]>(() => {
    const pricingByItemId: Record<string, ListingPricing> = {};
    listingPricings.forEach((p) => {
      if (p.ml_item_id) pricingByItemId[p.ml_item_id] = p;
    });

    const activeById: Record<string, MLItem> = {};
    activeItems.forEach((it) => {
      activeById[it.id] = it;
    });

    const map: Record<string, Aggregated> = {};

    for (const p of payments) {
      if (p.status !== "approved") continue;
      const dateStr = (p.date_approved || p.date_created).split("T")[0];
      if (dateStr !== today) continue;

      const itemId = getItemId(p);
      const key = itemId || (p.description || "sem-titulo").toLowerCase();
      const qty = getQty(p);

      if (!map[key]) {
        const pricing = itemId ? pricingByItemId[itemId] : undefined;
        const active = itemId ? activeById[itemId] : undefined;
        map[key] = {
          key,
          title: active?.title || pricing?.title || getItemTitle(p),
          thumbnail: active?.thumbnail || pricing?.thumbnail || null,
          faturamento: 0,
          unidades: 0,
          pedidos: 0,
          estoque: null,
        };
      }
      map[key].faturamento += p.transaction_amount;
      map[key].unidades += qty;
      map[key].pedidos += 1;
    }

    return Object.values(map)
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, limit);
  }, [payments, listingPricings, activeItems, today, limit]);

  if (top.length === 0) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-4">
        <h3 className="text-sm font-semibold text-foreground text-center mb-2">Produtos mais vendidos</h3>
        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma venda hoje ainda.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="bg-yellow-400/10 border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground text-center">Produtos mais vendidos</h3>
      </div>
      <ul className="divide-y">
        {top.map((p, idx) => (
          <li
            key={p.key}
            className={`flex items-center gap-3 px-4 py-3 ${
              idx === 0 ? "bg-yellow-400/15" : ""
            }`}
          >
            <span className="text-2xl font-black text-foreground/80 w-6 text-center">{idx + 1}</span>
            {p.thumbnail ? (
              <img src={p.thumbnail} alt={p.title} className="w-12 h-12 object-cover rounded border bg-muted" />
            ) : (
              <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center text-muted-foreground text-[10px]">
                s/img
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate" title={p.title}>
                {p.title}
              </p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>
                  Vendas do dia: <strong className="text-foreground">{fmt(p.faturamento)}</strong>
                </p>
                <p>
                  Unidades vendidas: <strong className="text-foreground">{p.unidades}</strong>
                  {" · "}
                  <span>Pedidos: <strong className="text-foreground">{p.pedidos}</strong></span>
                </p>
                <p>
                  Experiência de compra: <span className="text-green-500 font-semibold">100</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-green-500 font-semibold">Boa</span>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
