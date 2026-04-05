// Tabela de frete do Mercado Livre (valores aproximados 2024/2025)
// Frete Grátis e Rápido (Full) - valores por faixa de peso

export const FAIXAS_PESO = [
  { label: "Até 300g", value: "0-300", freteGratis: 6.50, fretePadrao: 6.50 },
  { label: "De 300g a 500g", value: "300-500", freteGratis: 7.00, fretePadrao: 7.00 },
  { label: "De 500g a 1kg", value: "500-1000", freteGratis: 8.00, fretePadrao: 8.00 },
  { label: "De 1kg a 1.5kg", value: "1000-1500", freteGratis: 8.50, fretePadrao: 8.50 },
  { label: "De 1.5 a 2kg", value: "1500-2000", freteGratis: 8.15, fretePadrao: 8.15 },
  { label: "De 2kg a 3kg", value: "2000-3000", freteGratis: 9.50, fretePadrao: 9.50 },
  { label: "De 3kg a 5kg", value: "3000-5000", freteGratis: 10.50, fretePadrao: 10.50 },
  { label: "De 5kg a 9kg", value: "5000-9000", freteGratis: 14.00, fretePadrao: 14.00 },
  { label: "De 9kg a 13kg", value: "9000-13000", freteGratis: 18.00, fretePadrao: 18.00 },
  { label: "De 13kg a 18kg", value: "13000-18000", freteGratis: 22.00, fretePadrao: 22.00 },
  { label: "De 18kg a 23kg", value: "18000-23000", freteGratis: 26.00, fretePadrao: 26.00 },
  { label: "De 23kg a 30kg", value: "23000-30000", freteGratis: 30.00, fretePadrao: 30.00 },
];

export function getFreteByFaixa(faixaValue: string, isFull: boolean): number {
  const faixa = FAIXAS_PESO.find((f) => f.value === faixaValue);
  if (!faixa) return 0;
  return isFull ? faixa.freteGratis : faixa.fretePadrao;
}
