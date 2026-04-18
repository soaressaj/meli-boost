import { getFreteByFaixa } from "@/components/precificacao/FreteTable";
import type { ListingPricing } from "@/hooks/useListingPricing";
import type { MLItem } from "@/hooks/useMLActiveItems";
import type { MPPayment } from "@/types/mercadopago";

type PaymentItem = {
  id?: string;
  title: string;
  quantity: number;
  unitPrice?: number;
};

export function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function toLocalDateKey(value?: string | Date | null) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPaymentDateKey(payment: MPPayment) {
  return toLocalDateKey(payment.date_approved || payment.date_created);
}

export function getPaymentItems(payment: MPPayment): PaymentItem[] {
  const items = payment.additional_info?.items;

  if (!items?.length) {
    return [
      {
        id: undefined,
        title: payment.description || "Produto sem título",
        quantity: 1,
      },
    ];
  }

  return items.map((item) => ({
    id: item.id,
    title: item.title || payment.description || "Produto sem título",
    quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    unitPrice: Number(item.unit_price) > 0 ? Number(item.unit_price) : undefined,
  }));
}

export function buildPricingMaps(pricings: ListingPricing[]) {
  const byId: Record<string, ListingPricing> = {};
  const byTitle: Record<string, ListingPricing> = {};

  pricings.forEach((pricing) => {
    if (pricing.ml_item_id) byId[pricing.ml_item_id] = pricing;
    if (pricing.title) byTitle[normalizeText(pricing.title)] = pricing;
  });

  return { byId, byTitle };
}

export function buildActiveItemMaps(items: MLItem[]) {
  const byId: Record<string, MLItem> = {};
  const byTitle: Record<string, MLItem> = {};

  items.forEach((item) => {
    byId[item.id] = item;
    if (item.title) byTitle[normalizeText(item.title)] = item;
  });

  return { byId, byTitle };
}

export function resolvePricing(
  item: Pick<PaymentItem, "id" | "title">,
  pricingMap: ReturnType<typeof buildPricingMaps>
) {
  if (item.id && pricingMap.byId[item.id]) return pricingMap.byId[item.id];
  const normalizedTitle = normalizeText(item.title);
  return normalizedTitle ? pricingMap.byTitle[normalizedTitle] : undefined;
}

export function resolveActiveItem(
  item: Pick<PaymentItem, "id" | "title">,
  activeMap: ReturnType<typeof buildActiveItemMaps>
) {
  if (item.id && activeMap.byId[item.id]) return activeMap.byId[item.id];
  const normalizedTitle = normalizeText(item.title);
  return normalizedTitle ? activeMap.byTitle[normalizedTitle] : undefined;
}

export function calcListingUnitProfit(pricing: ListingPricing) {
  const precoVenda = Number(pricing.price || 0);
  const frete =
    pricing.frete_manual !== null && pricing.frete_manual !== undefined
      ? Number(pricing.frete_manual)
      : getFreteByFaixa(pricing.faixa_peso || "0-300", Boolean(pricing.is_full));
  const taxaFixaAnuncio = precoVenda * Number(pricing.taxa_anuncio || 0);
  const taxaFixaComDesconto = taxaFixaAnuncio - Number(pricing.bonus_campanha || 0);
  const taxaFixaUnidadeML = Math.max(taxaFixaComDesconto, 0);
  const custoML = frete + taxaFixaUnidadeML;
  const icmsVal = precoVenda * Number(pricing.icms_estado || 0);
  const custoKit = pricing.is_kit
    ? Number(pricing.custo_produto || 0) * Number(pricing.qtd_kit || 1)
    : Number(pricing.custo_produto || 0);
  const custoTotal =
    custoML +
    icmsVal +
    Number(pricing.diferenca_icms || 0) +
    custoKit +
    Number(pricing.embalagem || 0) +
    Number(pricing.transporte || 0) +
    Number(pricing.etiqueta || 0);
  const descontoAfiliados = precoVenda * Number(pricing.bonus_afiliados || 0);

  return precoVenda - custoTotal - descontoAfiliados;
}