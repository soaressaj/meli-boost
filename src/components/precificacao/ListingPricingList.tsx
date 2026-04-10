import { useState, useMemo } from "react";
import { useAuth } from "@/components/layout/Layout";
import { useMLActiveItems, MLItem } from "@/hooks/useMLActiveItems";
import { useListingPricings, useUpsertListingPricing, ListingPricing } from "@/hooks/useListingPricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FAIXAS_PESO, getFreteByFaixa } from "./FreteTable";
import { Save, ChevronDown, ChevronUp, Search, PackageOpen, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function pct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
}

function calcPricing(p: {
  precoVenda: number; custoProduto: number; isKit: boolean; qtdKit: number;
  bonusCampanha: number; taxaAnuncio: number; diferencaICMS: number; icmsEstado: number;
  faixaPeso: string; isFull: boolean; margemDesejada: number; embalagem: number;
  transporte: number; etiqueta: number; bonusAfiliados: number; freteManual: number | null;
}) {
  const frete = p.freteManual !== null ? p.freteManual : getFreteByFaixa(p.faixaPeso, p.isFull);
  const taxaFixaAnuncio = p.precoVenda * p.taxaAnuncio;
  const taxaFixaComDesconto = taxaFixaAnuncio - p.bonusCampanha;
  const taxaFixaUnidadeML = Math.max(taxaFixaComDesconto, 0);
  const custoML = frete + taxaFixaUnidadeML;
  const icmsVal = p.precoVenda * p.icmsEstado;
  const custoKit = p.isKit ? p.custoProduto * p.qtdKit : p.custoProduto;
  const custoTotal = custoML + icmsVal + p.diferencaICMS + custoKit + p.embalagem + p.transporte + p.etiqueta;
  const descontoAfiliados = p.precoVenda * p.bonusAfiliados;
  const afiliadosNoLucro = p.precoVenda > 0 ? descontoAfiliados / p.precoVenda : 0;
  const recebeML = p.precoVenda - custoML;
  const recebeMLComICMS = recebeML - icmsVal;
  const lucro = p.precoVenda - custoTotal - descontoAfiliados;
  const margem = p.precoVenda > 0 ? lucro / p.precoVenda : 0;
  const roi = custoTotal > 0 ? lucro / custoTotal : 0;
  const roasMinimo = custoTotal > 0 ? p.precoVenda / custoTotal : 0;
  const gastoMaxAds = Math.max(lucro, 0);
  const custoUnitario = p.isKit ? custoKit / p.qtdKit : p.custoProduto;
  const custoUnitarioComICMS = custoUnitario + (p.diferencaICMS / (p.isKit ? p.qtdKit : 1));
  const valorEmpatar = custoTotal;
  const valorVendaMargem = p.margemDesejada < 1 ? custoTotal / (1 - p.margemDesejada) : 0;
  const valorAcimaMargem = valorVendaMargem - p.precoVenda;
  const custoParaMargem = p.precoVenda * p.margemDesejada;
  const descontoNecessario = p.precoVenda > valorVendaMargem ? (p.precoVenda - valorVendaMargem) / p.precoVenda : 0;

  return {
    frete, taxaFixaAnuncio, taxaFixaUnidadeML, custoML, icmsVal, custoTotal,
    roasMinimo, gastoMaxAds, descontoAfiliados, afiliadosNoLucro, custoKit,
    custoUnitario, custoUnitarioComICMS, valorEmpatar, valorVendaMargem,
    valorAcimaMargem, custoParaMargem, descontoNecessario, recebeML, recebeMLComICMS,
    roi, margem, lucro,
  };
}

interface ListingRowProps {
  item: MLItem;
  savedPricing: ListingPricing | undefined;
  onSave: (data: any) => void;
  isSaving: boolean;
}

function ListingRow({ item, savedPricing, onSave, isSaving }: ListingRowProps) {
  const [expanded, setExpanded] = useState(false);

  const [form, setForm] = useState({
    precoVenda: savedPricing?.price ?? item.price ?? 0,
    custoProduto: savedPricing?.custo_produto ?? 0,
    isKit: savedPricing?.is_kit ?? false,
    qtdKit: savedPricing?.qtd_kit ?? 1,
    bonusCampanha: savedPricing?.bonus_campanha ?? 0,
    taxaAnuncio: savedPricing?.taxa_anuncio ?? 0.14,
    diferencaICMS: savedPricing?.diferenca_icms ?? 0,
    icmsEstado: savedPricing?.icms_estado ?? 0.04,
    faixaPeso: savedPricing?.faixa_peso ?? "0-300",
    isFull: savedPricing?.is_full ?? (item.shipping?.logistic_type === "fulfillment"),
    margemDesejada: savedPricing?.margem_desejada ?? 0.15,
    embalagem: savedPricing?.embalagem ?? 0,
    transporte: savedPricing?.transporte ?? 0,
    etiqueta: savedPricing?.etiqueta ?? 0,
    bonusAfiliados: savedPricing?.bonus_afiliados ?? 0,
    freteManual: savedPricing?.frete_manual ?? null,
  });

  const calc = useMemo(() => calcPricing(form), [form]);
  const isViable = calc.lucro > 0;

  const handleSave = () => {
    onSave({
      ml_item_id: item.id,
      title: item.title,
      thumbnail: item.thumbnail,
      price: form.precoVenda,
      custo_produto: form.custoProduto,
      is_kit: form.isKit,
      qtd_kit: form.qtdKit,
      bonus_campanha: form.bonusCampanha,
      taxa_anuncio: form.taxaAnuncio,
      diferenca_icms: form.diferencaICMS,
      icms_estado: form.icmsEstado,
      faixa_peso: form.faixaPeso,
      is_full: form.isFull,
      is_alimento_animal: false,
      margem_desejada: form.margemDesejada,
      embalagem: form.embalagem,
      transporte: form.transporte,
      etiqueta: form.etiqueta,
      bonus_afiliados: form.bonusAfiliados,
      frete_manual: form.freteManual,
    });
  };

  const upd = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      {/* Header row - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <img
          src={item.thumbnail?.replace("http://", "https://") || "/placeholder.svg"}
          alt=""
          className="w-12 h-12 rounded object-cover bg-muted flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.id}</p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{fmt(form.precoVenda)}</p>
            <p className={`text-xs font-semibold ${isViable ? "text-success" : "text-destructive"}`}>
              Lucro: {fmt(calc.lucro)}
            </p>
          </div>
          <Badge variant={isViable ? "default" : "destructive"} className={isViable ? "bg-success text-success-foreground" : ""}>
            {pct(calc.margem)}
          </Badge>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t p-4 space-y-5">
          {/* Input fields */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <Field label="Preço de Venda (R$)" value={form.precoVenda} onChange={(v) => upd("precoVenda", v)} />
            <Field label="Custo Unitário (R$)" value={form.custoProduto} onChange={(v) => upd("custoProduto", v)} />
            <Field label="Bônus Campanha (R$)" value={form.bonusCampanha} onChange={(v) => upd("bonusCampanha", v)} />
            <Field label="Taxa Anúncio (%)" value={form.taxaAnuncio} onChange={(v) => upd("taxaAnuncio", v)} step="0.001" hint="0.14 = 14%" />
            <Field label="Diferença ICMS (R$)" value={form.diferencaICMS} onChange={(v) => upd("diferencaICMS", v)} />
            <Field label="ICMS Estado (%)" value={form.icmsEstado} onChange={(v) => upd("icmsEstado", v)} step="0.001" hint="0.04 = 4%" />
            <Field label="Margem Desejada (%)" value={form.margemDesejada} onChange={(v) => upd("margemDesejada", v)} step="0.01" hint="0.15 = 15%" />
            <Field label="Embalagem (R$)" value={form.embalagem} onChange={(v) => upd("embalagem", v)} />
            <Field label="Transporte (R$)" value={form.transporte} onChange={(v) => upd("transporte", v)} />
            <Field label="Etiqueta (R$)" value={form.etiqueta} onChange={(v) => upd("etiqueta", v)} />
            <Field label="Bônus Afiliados (%)" value={form.bonusAfiliados} onChange={(v) => upd("bonusAfiliados", v)} step="0.01" hint="0.10 = 10%" />

            {/* Kit */}
            <div className="space-y-1">
              <Label className="text-xs">Kit</Label>
              <div className="flex items-center gap-2">
                <Switch checked={form.isKit} onCheckedChange={(v) => upd("isKit", v)} />
                {form.isKit && (
                  <Input className="w-16 h-8 text-xs" type="number" value={form.qtdKit}
                    onChange={(e) => upd("qtdKit", Number(e.target.value))} />
                )}
              </div>
            </div>
          </div>

          {/* Frete section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Faixa de Peso</Label>
              <Select value={form.faixaPeso} onValueChange={(v) => upd("faixaPeso", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FAIXAS_PESO.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Logística</Label>
              <div className="flex items-center gap-2 h-8">
                <Switch checked={form.isFull} onCheckedChange={(v) => upd("isFull", v)} />
                <span className="text-xs text-muted-foreground">{form.isFull ? "Full" : "Padrão"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Frete Manual (R$)</Label>
              <div className="flex items-center gap-2">
                <Switch checked={form.freteManual !== null} onCheckedChange={(v) => upd("freteManual", v ? 0 : null)} />
                {form.freteManual !== null && (
                  <Input className="w-20 h-8 text-xs" type="number" step="0.01" value={form.freteManual}
                    onChange={(e) => upd("freteManual", Number(e.target.value))} />
                )}
              </div>
            </div>
            <div className="flex items-end">
              <p className="text-xs text-muted-foreground">Frete estimado: <strong className="text-foreground">{fmt(calc.frete)}</strong></p>
            </div>
          </div>

          <Separator />

          {/* Results - CUSTOS */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-destructive uppercase">Custos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <MiniRow label="Frete" value={fmt(calc.frete)} />
              <MiniRow label="Taxa Fixa Anúncio" value={fmt(calc.taxaFixaAnuncio)} />
              <MiniRow label="Taxa c/ Desconto" value={fmt(calc.taxaFixaUnidadeML)} />
              <MiniRow label="Custo ML" value={fmt(calc.custoML)} />
              <MiniRow label="ICMS" value={fmt(calc.icmsVal)} />
              <MiniRow label="Dif. ICMS Estados" value={fmt(form.diferencaICMS)} />
              <MiniRow label="Custo Total" value={fmt(calc.custoTotal)} bold />
              <MiniRow label="ROAS Mínimo" value={calc.roasMinimo.toFixed(2)} />
              <MiniRow label="Gasto Máx ADS" value={fmt(calc.gastoMaxAds)} />
              <MiniRow label="Desc. Afiliados" value={fmt(calc.descontoAfiliados)} />
              <MiniRow label="% Afiliados/Lucro" value={pct(calc.afiliadosNoLucro)} />
            </div>
          </div>

          {/* VIABILIDADE */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-warning uppercase">Viabilidade</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <MiniRow label="Custo do KIT" value={fmt(calc.custoKit)} />
              <MiniRow label="Custo Unitário" value={fmt(calc.custoUnitario)} />
              <MiniRow label="Custo Unit. c/ ICMS" value={fmt(calc.custoUnitarioComICMS)} />
              <MiniRow label="Valor p/ Empatar" value={fmt(calc.valorEmpatar)} />
              <MiniRow label="Valor Venda p/ Margem" value={fmt(calc.valorVendaMargem)} bold />
              <MiniRow label="Acima da Margem" value={fmt(calc.valorAcimaMargem)} />
              <MiniRow label="Custo p/ Margem" value={fmt(calc.custoParaMargem)} />
              <MiniRow label="Desc. Necessário" value={pct(calc.descontoNecessario)} />
            </div>
          </div>

          {/* RESUMO FINANCEIRO */}
          <div className={`rounded-lg p-3 ${isViable ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"}`}>
            <h4 className="text-xs font-semibold uppercase mb-2">Resumo Financeiro</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">Recebe do ML</p>
                <p className="text-sm font-bold text-foreground">{fmt(calc.recebeML)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Recebe ML - ICMS</p>
                <p className="text-sm font-bold text-foreground">{fmt(calc.recebeMLComICMS)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">ROI (R$1 retorna)</p>
                <p className="text-sm font-bold text-foreground">{calc.roi.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Margem</p>
                <p className={`text-sm font-bold ${isViable ? "text-success" : "text-destructive"}`}>{pct(calc.margem)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">LUCRO</p>
                <p className={`text-base font-bold ${isViable ? "text-success" : "text-destructive"}`}>{fmt(calc.lucro)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, step = "0.01", hint }: {
  label: string; value: number; onChange: (v: number) => void; step?: string; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input className="h-8 text-xs" type="number" step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MiniRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5 px-2 rounded bg-muted/30">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}

export function ListingPricingList() {
  const { user } = useAuth();
  const { data: items = [], isLoading: loadingItems } = useMLActiveItems(!!user?.id);
  const { data: pricings = [], isLoading: loadingPricings } = useListingPricings(user?.id);
  const upsert = useUpsertListingPricing(user?.id);
  const [search, setSearch] = useState("");

  const pricingMap = useMemo(() => {
    const map: Record<string, ListingPricing> = {};
    for (const p of pricings) map[p.ml_item_id] = p;
    return map;
  }, [pricings]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter((i) => i.title?.toLowerCase().includes(s) || i.id?.toLowerCase().includes(s));
  }, [items, search]);

  const handleSave = (data: any) => {
    upsert.mutate(data, {
      onSuccess: () => toast.success("Precificação salva!"),
      onError: () => toast.error("Erro ao salvar"),
    });
  };

  if (loadingItems || loadingPricings) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando anúncios ativos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar anúncio por título ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} anúncio(s) ativo(s)</p>

      {/* Listing list */}
      <div className="space-y-2">
        {filtered.map((item) => (
          <ListingRow
            key={item.id}
            item={item}
            savedPricing={pricingMap[item.id]}
            onSave={handleSave}
            isSaving={upsert.isPending}
          />
        ))}
      </div>

      {filtered.length === 0 && !loadingItems && (
        <div className="text-center py-12 text-muted-foreground">
          <PackageOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum anúncio ativo encontrado</p>
        </div>
      )}
    </div>
  );
}
