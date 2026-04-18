import { useMemo } from "react";
import type { MPPayment } from "@/types/mercadopago";
import type { ListingPricing } from "@/hooks/useListingPricing";
import type { MLItem } from "@/hooks/useMLActiveItems";
import type { AdsReportDay } from "@/hooks/useMLAdsReport";

interface Props {
  payments: MPPayment[];
  listingPricings?: ListingPricing[];
  activeItems?: MLItem[];
  adsReport?: AdsReportDay[];
  limit?: number;
}

interface Aggregated {
  key: string;
  itemId?: string;
  title: string;
  thumbnail: string | null;
  faturamento: number;
  unidades: number;
  pedidos: number;
  estoque: number | null;
  adsGasto: number;
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

function pickThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;
  // ML costuma servir https; força https para não bloquear por mixed-content
  return url.replace(/^http:\/\//, "https://");
}

export function TopSellingProducts({
  payments,
  listingPricings = [],
  activeItems = [],
  adsReport = [],
  limit = 10,
}: Props) {
  const today = new Date().toISOString().split("T")[0];

  const top = useMemo<Aggregated[]>(() => {
    const pricingByItemId: Record<string, ListingPricing> = {};
    const pricingByTitle: Record<string, ListingPricing> = {};
    listingPricings.forEach((p) => {
      if (p.ml_item_id) pricingByItemId[p.ml_item_id] = p;
      if (p.title) pricingByTitle[p.title.toLowerCase()] = p;
    });

    const activeById: Record<string, MLItem> = {};
    const activeByTitle: Record<string, MLItem> = {};
    activeItems.forEach((it) => {
      activeById[it.id] = it;
      if (it.title) activeByTitle[it.title.toLowerCase()] = it;
    });

    const map: Record<string, Aggregated> = {};
    let totalFatHoje = 0;

    for (const p of payments) {
      if (p.status !== "approved") continue;
      const dateStr = (p.date_approved || p.date_created).split("T")[0];
      if (dateStr !== today) continue;

      const itemId = getItemId(p);
      const rawTitle = getItemTitle(p);
      const titleKey = rawTitle.toLowerCase();

      // Chave de agregação preferindo itemId, depois título normalizado
      const key = itemId || titleKey;
      const qty = getQty(p);

      if (!map[key]) {
        const active =
          (itemId && activeById[itemId]) ||
          activeByTitle[titleKey] ||
          undefined;
        const pricing =
          (itemId && pricingByItemId[itemId]) ||
          pricingByTitle[titleKey] ||
          undefined;

        map[key] = {
          key,
          itemId: itemId || active?.id,
          title: active?.title || pricing?.title || rawTitle,
          thumbnail: pickThumbnail(active?.thumbnail || pricing?.thumbnail),
          faturamento: 0,
          unidades: 0,
          pedidos: 0,
          estoque: active?.available_quantity ?? null,
          adsGasto: 0,
        };
      }
      map[key].faturamento += p.transaction_amount;
      map[key].unidades += qty;
      map[key].pedidos += 1;
      totalFatHoje += p.transaction_amount;
    }

    // Distribui o gasto total de Ads de hoje proporcionalmente ao faturamento de cada produto
    const adsHoje = adsReport
      .filter((a) => a.date === today)
      .reduce((s, a) => s + a.cost, 0);

    if (totalFatHoje > 0 && adsHoje > 0) {
      Object.values(map).forEach((p) => {
        p.adsGasto = (p.faturamento / totalFatHoje) * adsHoje;
      });
    }

    return Object.values(map)
      .sort((a, b) => b.unidades - a.unidades || b.faturamento - a.faturamento)
      .slice(0, limit);
  }, [payments, listingPricings, activeItems, adsReport, today, limit]);

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
              <img
                src={p.thumbnail}
                alt={p.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-12 h-12 object-cover rounded border bg-muted"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
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
                  Estoque: <strong className="text-foreground">{p.estoque ?? "—"}</strong>
                  {" · "}
                  Unidades vendidas: <strong className="text-foreground">{p.unidades}</strong>
                </p>
                <p>
                  Gasto com Ads (dia): <strong className="text-pink-500">{fmt(p.adsGasto)}</strong>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
