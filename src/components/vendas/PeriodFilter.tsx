import { useState } from "react";
import type { PeriodKey, DateRange } from "@/types/mercadopago";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";

const periods: { key: PeriodKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "7dias", label: "7 dias" },
  { key: "30dias", label: "30 dias" },
  { key: "mes_atual", label: "Mês Atual" },
  { key: "1ano", label: "1 ano" },
  { key: "personalizado", label: "Personalizado" },
];

function getDateRange(key: PeriodKey): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case "hoje": return { start: today, end: today };
    case "ontem": { const d = new Date(today); d.setDate(d.getDate() - 1); return { start: d, end: d }; }
    case "7dias": { const d = new Date(today); d.setDate(d.getDate() - 7); return { start: d, end: today }; }
    case "30dias": { const d = new Date(today); d.setDate(d.getDate() - 30); return { start: d, end: today }; }
    case "mes_atual": return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: today };
    case "1ano": { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return { start: d, end: today }; }
    default: return { start: today, end: today };
  }
}

interface Props {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function PeriodFilter({ dateRange, onDateRangeChange }: Props) {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("hoje");
  const [customOpen, setCustomOpen] = useState(false);

  const handlePeriodClick = (key: PeriodKey) => {
    setActivePeriod(key);
    if (key === "personalizado") {
      setCustomOpen(true);
    } else {
      onDateRangeChange(getDateRange(key));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {periods.map((p) => (
        p.key === "personalizado" ? (
          <Popover key={p.key} open={customOpen} onOpenChange={setCustomOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={activePeriod === p.key ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodClick(p.key)}
                className="gap-1"
              >
                <CalendarDays className="h-3 w-3" />
                {activePeriod === "personalizado"
                  ? `${format(dateRange.start, "dd/MM")} - ${format(dateRange.end, "dd/MM")}`
                  : p.label}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.start, to: dateRange.end }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    onDateRangeChange({ start: range.from, end: range.to });
                    setCustomOpen(false);
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            key={p.key}
            variant={activePeriod === p.key ? "default" : "outline"}
            size="sm"
            onClick={() => handlePeriodClick(p.key)}
          >
            {p.label}
          </Button>
        )
      ))}
    </div>
  );
}
