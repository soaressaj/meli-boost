import { useMemo } from "react";
import type { MPPayment } from "@/types/mercadopago";
import type { ListingPricing } from "@/hooks/useListingPricing";
import type { MLItem } from "@/hooks/useMLActiveItems";
import type { AdsReportDay } from "@/hooks/useMLAdsReport";
import {
  buildActiveItemMaps,
  buildPricingMaps,
  getPaymentDateKey,
  getPaymentItems,
  normalizeText,
  resolveActiveItem,
  resolvePricing,
  toLocalDateKey,
} from "@/lib/vendas-metrics";

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

function pickThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//, "https://");
}

export function TopSellingProducts({
  payments,
  listingPricings = [],
  activeItems = [],
  adsReport = [],
  limit = 10,
}: Props) {
  const today = toLocalDateKey(new Date());

  const top = useMemo<Aggregated[]>(() => {
    const pricingMap = buildPricingMaps(listingPricings);
    const activeMap = buildActiveItemMaps(activeItems);

    const map: Record<string, Aggregated> = {};
    let totalFatHoje = 0;

    for (const p of payments) {
      if (p.status !== "approved") continue;
      const dateStr = getPaymentDateKey(p);
      if (dateStr !== today) continue;

      const items = getPaymentItems(p);
      const paymentQty = items.reduce((sum, item) => sum + item.quantity, 0) || 1;

      for (const item of items) {
        const pricing = resolvePricing(item, pricingMap);
        const active = resolveActiveItem(
          { id: item.id || pricing?.ml_item_id, title: pricing?.title || item.title },
          activeMap
        );

        const canonicalId = item.id || pricing?.ml_item_id || active?.id;
        const canonicalTitle = active?.title || pricing?.title || item.title || "Produto sem título";
        const key = canonicalId || normalizeText(canonicalTitle);
        const unitRevenue = item.unitPrice ?? (paymentQty > 0 ? p.transaction_amount / paymentQty : p.transaction_amount);
        const revenue = unitRevenue * item.quantity;

        if (!map[key]) {
          map[key] = {
            key,
            itemId: canonicalId,
            title: canonicalTitle,
            thumbnail: pickThumbnail(active?.thumbnail || pricing?.thumbnail),
            faturamento: 0,
            unidades: 0,
            pedidos: 0,
            estoque: active?.available_quantity ?? null,
            adsGasto: 0,
          };
        }

        map[key].title = canonicalTitle;
        map[key].itemId = canonicalId;
        map[key].thumbnail = map[key].thumbnail || pickThumbnail(active?.thumbnail || pricing?.thumbnail);
        map[key].estoque = active?.available_quantity ?? map[key].estoque;
        map[key].faturamento += revenue;
        map[key].unidades += item.quantity;
        map[key].pedidos += 1;
        totalFatHoje += revenue;
      }
    }

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
