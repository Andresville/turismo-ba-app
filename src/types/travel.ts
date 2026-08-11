// Tipos de las Edge Functions de Mejoras 2 y 5. No son filas de tablas (por
// eso no viven en types/database.ts) — vuelos e itinerario son datos siempre
// en vivo, nunca persistidos.

export type EdgeFunctionError = {
  code: string;
  message: string;
};

export type EdgeFunctionResult<T> =
  | { success: true; data: T }
  | { success: false; error: EdgeFunctionError };

// ---------- flights-search ----------

export type FlightDirection = "from_ba" | "to_ba";

export interface FlightsSearchRequest {
  direction: FlightDirection;
  route: string; // código IATA del destino (from_ba) u origen (to_ba)
  lang: "es" | "en" | "pt"; // idioma del deep link de Aviasales
}

export interface FlightsSearchData {
  price: number;
  currency: string;
  approxDate: string | null;
  deepLink: string;
}

// ---------- hotel-link ----------

export interface HotelLinkRequest {
  lang: "es" | "en" | "pt";
}

export interface HotelLinkData {
  deepLink: string;
}

// ---------- itinerary-generate ----------

export interface ItineraryGenerateRequest {
  days: number; // 1-7
  styles: string[];
  lang: "es" | "en" | "pt";
}

export interface ItineraryStop {
  poi_id: string;
  horario_sugerido?: string;
  motivo?: string;
}

export interface ItineraryDay {
  dia: number;
  titulo: string;
  paradas: ItineraryStop[];
}

export interface ItineraryGenerateData {
  dias: ItineraryDay[];
}
