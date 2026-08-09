// Autocompletar de ciudades/aeropuertos de Travelpayouts. Es un endpoint
// público sin token (no protege ningún secret), así que se llama directo
// desde el cliente en vez de proxearlo por una Edge Function — mismo
// criterio que OpenRouteService en utils/routing.ts.
const BASE_URL = "https://autocomplete.travelpayouts.com/places2";

export interface PlaceResult {
  code: string; // IATA de 3 letras (ciudad o aeropuerto)
  name: string;
  cityName?: string;
  countryName?: string;
  type: "city" | "airport";
}

export async function searchPlaces(
  term: string,
  locale: "es" | "en" | "pt" = "es"
): Promise<PlaceResult[]> {
  const query = term.trim();
  if (query.length < 2) return [];

  try {
    const params = new URLSearchParams({ term: query, locale });
    params.append("types[]", "city");
    params.append("types[]", "airport");

    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json)) return [];

    return json
      .filter((p: any) => typeof p?.code === "string" && p.code.length === 3)
      .slice(0, 8)
      .map((p: any) => ({
        code: p.code,
        name: p.name ?? p.code,
        cityName: p.city_name,
        countryName: p.country_name,
        type:
          p.type === "airport" || p.type === "city"
            ? p.type
            : p.city_code && p.city_code !== p.code
            ? "airport"
            : "city",
      }));
  } catch (e) {
    console.error("Error al buscar destinos:", e);
    return [];
  }
}
