import type { FulfillmentCenter } from "@/hooks/useMLFulfillmentReport";

// Brazil approximate bounding box for coordinate mapping
// lat: -33.75 to 5.27, lng: -73.99 to -34.79
const BOUNDS = {
  minLat: -33.75,
  maxLat: 5.27,
  minLng: -73.99,
  maxLng: -34.79,
};

const MAP_WIDTH = 600;
const MAP_HEIGHT = 650;

function latLngToXY(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * MAP_WIDTH;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP_HEIGHT;
  return { x, y };
}

// Brazilian states simplified paths (approximate center points for labels)
const STATES: { id: string; name: string; lat: number; lng: number }[] = [
  { id: "AC", name: "Acre", lat: -9.97, lng: -67.81 },
  { id: "AL", name: "Alagoas", lat: -9.57, lng: -36.78 },
  { id: "AP", name: "Amapá", lat: 1.41, lng: -51.77 },
  { id: "AM", name: "Amazonas", lat: -3.07, lng: -61.66 },
  { id: "BA", name: "Bahia", lat: -12.96, lng: -38.51 },
  { id: "CE", name: "Ceará", lat: -3.71, lng: -38.54 },
  { id: "DF", name: "Distrito Federal", lat: -15.83, lng: -47.86 },
  { id: "ES", name: "Espírito Santo", lat: -19.19, lng: -40.34 },
  { id: "GO", name: "Goiás", lat: -16.64, lng: -49.31 },
  { id: "MA", name: "Maranhão", lat: -2.53, lng: -44.28 },
  { id: "MT", name: "Mato Grosso", lat: -12.64, lng: -55.42 },
  { id: "MS", name: "Mato Grosso do Sul", lat: -20.51, lng: -54.54 },
  { id: "MG", name: "Minas Gerais", lat: -18.10, lng: -44.38 },
  { id: "PA", name: "Pará", lat: -5.53, lng: -52.29 },
  { id: "PB", name: "Paraíba", lat: -7.06, lng: -35.55 },
  { id: "PR", name: "Paraná", lat: -25.25, lng: -52.02 },
  { id: "PE", name: "Pernambuco", lat: -8.28, lng: -35.07 },
  { id: "PI", name: "Piauí", lat: -8.28, lng: -43.68 },
  { id: "RJ", name: "Rio de Janeiro", lat: -22.84, lng: -43.15 },
  { id: "RN", name: "Rio Grande do Norte", lat: -5.22, lng: -36.52 },
  { id: "RS", name: "Rio Grande do Sul", lat: -30.01, lng: -51.22 },
  { id: "RO", name: "Rondônia", lat: -11.22, lng: -62.80 },
  { id: "RR", name: "Roraima", lat: 2.82, lng: -60.67 },
  { id: "SC", name: "Santa Catarina", lat: -27.33, lng: -49.37 },
  { id: "SP", name: "São Paulo", lat: -23.55, lng: -46.64 },
  { id: "SE", name: "Sergipe", lat: -10.90, lng: -37.07 },
  { id: "TO", name: "Tocantins", lat: -10.25, lng: -48.25 },
];

interface BrazilMapProps {
  centers: FulfillmentCenter[];
  totalOrders: number;
}

export function BrazilMap({ centers, totalOrders }: BrazilMapProps) {
  const maxCount = Math.max(...centers.map((c) => c.count), 1);

  return (
    <div className="relative w-full flex justify-center">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="w-full max-w-[500px] h-auto"
      >
        {/* Background shape of Brazil (simplified polygon) */}
        <path
          d="M 320 30 L 380 40 L 420 50 L 450 80 L 460 100 L 470 120 L 480 130 L 490 140 L 495 155 L 490 170 L 485 185 L 490 200 L 495 210 L 490 220 L 480 240 L 475 260 L 480 280 L 490 300 L 500 320 L 505 340 L 495 360 L 480 380 L 470 400 L 455 420 L 440 435 L 420 445 L 400 460 L 380 475 L 360 490 L 340 500 L 320 510 L 300 520 L 280 530 L 260 535 L 240 530 L 225 515 L 215 500 L 210 480 L 215 460 L 225 440 L 220 420 L 200 400 L 180 390 L 160 380 L 140 370 L 120 350 L 110 330 L 100 310 L 90 290 L 80 270 L 70 250 L 65 230 L 70 210 L 80 190 L 90 170 L 100 150 L 120 130 L 140 110 L 160 100 L 180 90 L 200 75 L 220 60 L 240 45 L 260 35 L 280 30 L 300 28 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          opacity="0.6"
        />

        {/* State labels */}
        {STATES.map((state) => {
          const { x, y } = latLngToXY(state.lat, state.lng);
          return (
            <text
              key={state.id}
              x={x}
              y={y}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="9"
              fontWeight="500"
              opacity="0.5"
            >
              {state.id}
            </text>
          );
        })}

        {/* Fulfillment center markers */}
        {centers.map((center) => {
          if (!center.lat || !center.lng) return null;
          const { x, y } = latLngToXY(center.lat, center.lng);
          const radius = Math.max(12, (center.count / maxCount) * 30);

          return (
            <g key={center.id}>
              {/* Glow */}
              <circle
                cx={x}
                cy={y}
                r={radius + 4}
                fill="hsl(var(--primary))"
                opacity="0.15"
              />
              {/* Main circle */}
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill="hsl(var(--primary))"
                opacity="0.85"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth="2"
              />
              {/* Count label */}
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-primary-foreground"
                fontSize="11"
                fontWeight="700"
              >
                {center.count}
              </text>
              {/* City label */}
              <text
                x={x}
                y={y + radius + 14}
                textAnchor="middle"
                className="fill-foreground"
                fontSize="10"
                fontWeight="600"
              >
                {center.city}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
