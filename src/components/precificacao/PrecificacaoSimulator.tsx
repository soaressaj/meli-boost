import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FAIXAS_PESO, getFreteByFaixa } from "./FreteTable";
import { PackageOpen, TrendingUp, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function pct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
}

export function PrecificacaoSimulator() {
  // === INFORMAÇÕES DE ENTRADA ===
  const [precoVenda, setPrecoVenda] = useState(59.90);
  const [custoProduto, setCustoProduto] = useState(1.52);
  const [isKit, setIsKit] = useState(true);
  const [qtdKit, setQtdKit] = useState(18);
  const [bonusCampanha, setBonusCampanha] = useState(3.36);
  const [taxaAnuncio, setTaxaAnuncio] = useState(0.14); // 14%
  const [diferencaICMS, setDiferencaICMS] = useState(0);
  const [icmsEstado, setIcmsEstado] = useState(0.04); // 4%
  const [faixaPeso, setFaixaPeso] = useState("1500-2000");
  const [isFull, setIsFull] = useState(true);
  const [isAlimentoAnimal, setIsAlimentoAnimal] = useState(false);
  const [fretePadrao, setFretePadrao] = useState(true);
  const [freteGratisRapido, setFreteGratisRapido] = useState(false);
  const [margemDesejada, setMargemDesejada] = useState(0.15); // 15%
  const [embalagem, setEmbalagem] = useState(0.25);
  const [transporte, setTransporte] = useState(0);
  const [etiqueta, setEtiqueta] = useState(0.06);
  const [bonusAfiliados, setBonusAfiliados] = useState(0); // %
  const [usarPrecoManual, setUsarPrecoManual] = useState(true);
  const [freteManual, setFreteManual] = useState<number | null>(null);

  // === CÁLCULOS ===
  const calc = useMemo(() => {
    const frete = freteManual !== null ? freteManual : getFreteByFaixa(faixaPeso, isFull);
    const taxaFixaAnuncio = precoVenda * taxaAnuncio;
    const taxaFixaComDesconto = taxaFixaAnuncio - bonusCampanha;
    const taxaFixaUnidadeML = taxaFixaComDesconto > 0 ? taxaFixaComDesconto : 0;
    const custoML = frete + taxaFixaUnidadeML;
    const icmsVal = precoVenda * icmsEstado;
    const diferencaICMSEstados = diferencaICMS;
    const custoKit = isKit ? custoProduto * qtdKit : custoProduto;
    const custoTotal = custoML + icmsVal + diferencaICMSEstados + custoKit + embalagem + transporte + etiqueta;

    const descontoAfiliados = precoVenda * bonusAfiliados;
    const afiliadosNoLucro = precoVenda > 0 ? descontoAfiliados / precoVenda : 0;

    const recebeML = precoVenda - custoML;
    const recebeMLComICMS = recebeML - icmsVal;
    const lucro = precoVenda - custoTotal - descontoAfiliados;
    const margem = precoVenda > 0 ? lucro / precoVenda : 0;
    const roi = custoTotal > 0 ? lucro / custoTotal : 0;

    // ROAS Mínimo: quanto preciso vender pra cobrir custo + ads
    const roasMinimo = custoTotal > 0 ? precoVenda / custoTotal : 0;
    const gastoMaxAds = lucro > 0 ? lucro : 0;

    // Viabilidade
    const custoUnitario = isKit ? custoKit / qtdKit : custoProduto;
    const custoUnitarioComICMS = custoUnitario + (diferencaICMS / (isKit ? qtdKit : 1));
    const custoUndCliente = isKit ? custoKit / qtdKit : custoProduto;
    const valorEmpatar = custoTotal; // break-even
    const valorVendaMargem = custoTotal / (1 - margemDesejada);
    const valorAcimaMargem = valorVendaMargem - precoVenda;
    const custoParaMargem = precoVenda * margemDesejada;
    const descontoNecessario = precoVenda > valorVendaMargem
      ? ((precoVenda - valorVendaMargem) / precoVenda)
      : 0;

    return {
      frete,
      taxaFixaAnuncio,
      taxaFixaUnidadeML,
      custoML,
      icmsVal,
      diferencaICMSEstados,
      custoTotal,
      roasMinimo,
      gastoMaxAds,
      descontoAfiliados,
      afiliadosNoLucro,
      custoKit,
      custoUnitario,
      custoUnitarioComICMS,
      custoUndCliente,
      valorEmpatar,
      valorVendaMargem,
      valorAcimaMargem,
      custoParaMargem,
      descontoNecessario,
      recebeML,
      recebeMLComICMS,
      roi,
      margem,
      lucro,
    };
  }, [precoVenda, custoProduto, isKit, qtdKit, bonusCampanha, taxaAnuncio,
      diferencaICMS, icmsEstado, faixaPeso, isFull, margemDesejada,
      embalagem, transporte, etiqueta, bonusAfiliados, freteManual]);

  const isViable = calc.lucro > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* INFORMAÇÕES DE ENTRADA */}
      <div className="bg-card rounded-lg border shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <PackageOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Informações de Entrada</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Preço de Venda */}
          <div className="space-y-2">
            <Label className="text-xs">Preço de Venda (R$)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(Number(e.target.value))}
                disabled={!usarPrecoManual}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={usarPrecoManual}
                onCheckedChange={(v) => setUsarPrecoManual(!!v)}
                id="preco-manual"
              />
              <label htmlFor="preco-manual" className="text-xs text-muted-foreground cursor-pointer">
                Usar preço manual (simulação)
              </label>
            </div>
          </div>

          {/* Custo do Produto */}
          <div className="space-y-2">
            <Label className="text-xs">Custo Unitário do Produto (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={custoProduto}
              onChange={(e) => setCustoProduto(Number(e.target.value))}
            />
          </div>

          {/* Kit */}
          <div className="space-y-2">
            <Label className="text-xs">É Kit?</Label>
            <div className="flex items-center gap-3">
              <Switch checked={isKit} onCheckedChange={setIsKit} />
              {isKit && (
                <Input
                  type="number"
                  className="w-20"
                  value={qtdKit}
                  onChange={(e) => setQtdKit(Number(e.target.value))}
                  placeholder="Qtd"
                />
              )}
              {isKit && <span className="text-xs text-muted-foreground">unidades por kit</span>}
            </div>
          </div>

          {/* Bônus Campanha */}
          <div className="space-y-2">
            <Label className="text-xs">Bônus Campanha (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={bonusCampanha}
              onChange={(e) => setBonusCampanha(Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">Desconto na taxa quando em promoção</p>
          </div>

          {/* Taxa do Anúncio */}
          <div className="space-y-2">
            <Label className="text-xs">Taxa do Anúncio (%)</Label>
            <Input
              type="number"
              step="0.001"
              value={taxaAnuncio}
              onChange={(e) => setTaxaAnuncio(Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">Ex: 0.14 = 14%</p>
          </div>

          {/* Diferença ICMS */}
          <div className="space-y-2">
            <Label className="text-xs">Diferença de ICMS (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={diferencaICMS}
              onChange={(e) => setDiferencaICMS(Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">ICMS diferença interestadual</p>
          </div>

          {/* ICMS Estado */}
          <div className="space-y-2">
            <Label className="text-xs">ICMS Estado (%)</Label>
            <Input
              type="number"
              step="0.001"
              value={icmsEstado}
              onChange={(e) => setIcmsEstado(Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">Ex: 0.04 = 4%</p>
          </div>

          {/* Faixa de Peso */}
          <div className="space-y-2">
            <Label className="text-xs">Faixa de Peso do Item</Label>
            <Select value={faixaPeso} onValueChange={setFaixaPeso}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FAIXAS_PESO.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={freteManual !== null}
                onCheckedChange={(v) => setFreteManual(v ? 0 : null)}
                id="frete-manual"
              />
              <label htmlFor="frete-manual" className="text-xs text-muted-foreground cursor-pointer">
                Informar frete manual
              </label>
            </div>
            {freteManual !== null && (
              <Input
                type="number"
                step="0.01"
                value={freteManual}
                onChange={(e) => setFreteManual(Number(e.target.value))}
                placeholder="Valor do frete"
              />
            )}
          </div>

          {/* Margem Desejada */}
          <div className="space-y-2">
            <Label className="text-xs">Margem Desejada (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={margemDesejada}
              onChange={(e) => setMargemDesejada(Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">Ex: 0.15 = 15%</p>
          </div>
        </div>

        {/* Checkboxes row */}
        <div className="flex flex-wrap gap-6 pt-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={isFull} onCheckedChange={(v) => setIsFull(!!v)} id="is-full" />
            <label htmlFor="is-full" className="text-xs cursor-pointer">Full / Correios</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isAlimentoAnimal} onCheckedChange={(v) => setIsAlimentoAnimal(!!v)} id="is-animal" />
            <label htmlFor="is-animal" className="text-xs cursor-pointer">Alimento P/ Animais</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={fretePadrao} onCheckedChange={(v) => setFretePadrao(!!v)} id="frete-padrao" />
            <label htmlFor="frete-padrao" className="text-xs cursor-pointer">Frete Padrão</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={freteGratisRapido} onCheckedChange={(v) => setFreteGratisRapido(!!v)} id="frete-gratis" />
            <label htmlFor="frete-gratis" className="text-xs cursor-pointer">Frete Grátis e Rápido {"<"}R$79</label>
          </div>
        </div>

        {/* Custos adicionais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">Embalagem (R$)</Label>
            <Input type="number" step="0.01" value={embalagem} onChange={(e) => setEmbalagem(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Transporte (R$)</Label>
            <Input type="number" step="0.01" value={transporte} onChange={(e) => setTransporte(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Etiqueta (R$)</Label>
            <Input type="number" step="0.01" value={etiqueta} onChange={(e) => setEtiqueta(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bônus Afiliados (%)</Label>
            <Input type="number" step="0.01" value={bonusAfiliados} onChange={(e) => setBonusAfiliados(Number(e.target.value))} />
            <p className="text-[10px] text-muted-foreground">Ex: 0.10 = 10%</p>
          </div>
        </div>
      </div>

      {/* CUSTOS */}
      <div className="bg-card rounded-lg border shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold text-foreground">Custos</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <Row label="Frete" value={fmt(calc.frete)} />
          <Row label="Taxa Fixa do Anúncio" value={fmt(calc.taxaFixaAnuncio)} />
          <Row label="Taxa c/ Desconto" value={fmt(calc.taxaFixaUnidadeML)} />
          <Row label="Custo Mercado Livre" value={fmt(calc.custoML)} />
          <Row label="ICMS" value={fmt(calc.icmsVal)} />
          <Row label="Diferença ICMS Estados" value={fmt(calc.diferencaICMSEstados)} />
          <Row label="Custo Total" value={fmt(calc.custoTotal)} highlight />
          <Row label="ROAS Mínimo" value={calc.roasMinimo.toFixed(2)} />
          <Row label="Gasto Máx ADS/Venda" value={fmt(calc.gastoMaxAds)} />
          <Row label="Desconto Afiliados" value={fmt(calc.descontoAfiliados)} />
          <Row label="% Afiliados no Lucro" value={pct(calc.afiliadosNoLucro)} />
        </div>
      </div>

      {/* VIABILIDADE */}
      <div className="bg-card rounded-lg border shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-warning" />
          <h2 className="text-lg font-semibold text-foreground">Viabilidade</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <Row label="Custo do KIT" value={fmt(calc.custoKit)} />
          <Row label="Custo Unitário" value={fmt(calc.custoUnitario)} />
          <Row label="Custo Unit. c/ ICMS" value={fmt(calc.custoUnitarioComICMS)} />
          <Row label="Custo Und P/ Cliente" value={fmt(calc.custoUndCliente)} />
          <Row label="Valor p/ Empatar" value={fmt(calc.valorEmpatar)} />
          <Row label="Valor Venda p/ Margem" value={fmt(calc.valorVendaMargem)} highlight />
          <Row label="Valor Acima da Margem" value={fmt(calc.valorAcimaMargem)} />
          <Row label="Custo Para Margem" value={fmt(calc.custoParaMargem)} />
          <Row label="Desconto Necessário" value={pct(calc.descontoNecessario)} />
        </div>
      </div>

      {/* RESUMO FINANCEIRO */}
      <div className={`rounded-lg border shadow-sm p-6 space-y-3 ${isViable ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
        <div className="flex items-center gap-2 mb-2">
          {isViable ? (
            <CheckCircle className="h-5 w-5 text-success" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          )}
          <h2 className="text-lg font-semibold text-foreground">Resumo Financeiro</h2>
          <Badge variant={isViable ? "default" : "destructive"} className={isViable ? "bg-success text-success-foreground" : ""}>
            {isViable ? "Viável" : "Inviável"}
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Recebe do ML</p>
            <p className="text-lg font-bold text-foreground">{fmt(calc.recebeML)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Recebe ML - ICMS</p>
            <p className="text-lg font-bold text-foreground">{fmt(calc.recebeMLComICMS)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ROI (R$1 retorna)</p>
            <p className="text-lg font-bold text-foreground">{calc.roi.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Margem</p>
            <p className={`text-lg font-bold ${isViable ? 'text-success' : 'text-destructive'}`}>
              {pct(calc.margem)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">LUCRO</p>
            <p className={`text-xl font-bold ${isViable ? 'text-success' : 'text-destructive'}`}>
              {fmt(calc.lucro)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1 px-2 rounded-md bg-muted/30">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`font-medium ${highlight ? 'text-foreground font-bold' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}
