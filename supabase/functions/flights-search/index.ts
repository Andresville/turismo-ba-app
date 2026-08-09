import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "./cors.ts";

const TIMEOUT_MS = 8000;

// "trs" = traffic source = el ID del proyecto "Aplicación móvil" del usuario
// en Travelpayouts (visible como ?source=560502 en las URLs del dashboard,
// no el ID genérico 100 del programa Aviasales en sí — probado y confirmado
// que 100 da error "invalid traffic source"). No es un secreto, así que
// vive como constante en el código.
const TRAVELPAYOUTS_TRS = 560502;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  ms = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// YYYY-MM-DD -> DDMM, el formato que usa el token de búsqueda de Aviasales
// (confirmado probando un link real generado desde el dashboard).
function toDDMM(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}${m}`;
}

function defaultDepartDateDDMM(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}${mm}`;
}

interface CheapOption {
  price: number;
  airline: string;
  flightNumber: string;
  departureAt: string;
  returnAt: string | null;
  transfers: number;
  expiresAt: string;
}

// La respuesta de /v1/prices/cheap viene agrupada de forma variable
// (a veces un array, a veces anidada por aerolínea) — se normaliza de forma
// defensiva en vez de asumir una única forma.
function normalizeCheapOptions(json: any): CheapOption[] {
  const data = json?.data;
  if (!data) return [];
  const entries: any[] = Array.isArray(data)
    ? data
    : Object.values(data).flatMap((v: any) =>
        v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [v]
      );
  return entries
    .filter((e) => e && typeof e === "object" && typeof e.price === "number")
    .sort((a, b) => a.price - b.price)
    .slice(0, 5)
    .map((e) => ({
      price: e.price,
      airline: e.airline ?? "",
      flightNumber: e.flight_number != null ? String(e.flight_number) : "",
      departureAt: e.departure_at ?? "",
      returnAt: e.return_at ?? null,
      transfers: e.transfers ?? 0,
      expiresAt: e.expires_at ?? "",
    }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const direction =
      body?.direction === "to_ba" ? "to_ba" : body?.direction === "from_ba" ? "from_ba" : null;
    const route = typeof body?.route === "string" ? body.route.toUpperCase().trim() : "";
    const locale = ["es", "en", "pt"].includes(body?.lang) ? body.lang : "es";

    if (!direction || !/^[A-Z]{3}$/.test(route)) {
      return jsonResponse({
        success: false,
        error: { code: "INVALID_INPUT", message: "direction y route (IATA de 3 letras) son requeridos" },
      });
    }

    const token = Deno.env.get("TRAVELPAYOUTS_TOKEN");
    const marker = Deno.env.get("TRAVELPAYOUTS_MARKER");
    if (!token || !marker) {
      return jsonResponse({
        success: false,
        error: { code: "NOT_CONFIGURED", message: "Credenciales de Travelpayouts no configuradas" },
      });
    }

    const origin = direction === "from_ba" ? "BUE" : route;
    const destination = direction === "from_ba" ? route : "BUE";

    const latestUrl = `https://api.travelpayouts.com/v2/prices/latest?currency=usd&origin=${origin}&destination=${destination}&token=${token}`;
    const cheapUrl = `https://api.travelpayouts.com/v1/prices/cheap?origin=${origin}&destination=${destination}&currency=usd&token=${token}`;

    const [latestRes, cheapRes] = await Promise.allSettled([
      fetchWithTimeout(latestUrl),
      fetchWithTimeout(cheapUrl),
    ]);

    let latest: {
      price: number;
      currency: string;
      departDate: string;
      returnDate: string | null;
      transfers: number;
      foundAt: string;
    } | null = null;

    if (latestRes.status === "fulfilled" && latestRes.value.ok) {
      const json = await latestRes.value.json();
      const entries: any[] = Array.isArray(json?.data) ? json.data : [];
      if (entries.length > 0) {
        const best = entries.reduce((min, e) => (e.value < min.value ? e : min), entries[0]);
        latest = {
          price: best.value,
          currency: "USD",
          departDate: best.depart_date ?? "",
          returnDate: best.return_date ?? null,
          transfers: best.number_of_changes ?? 0,
          foundAt: best.found_at ?? "",
        };
      }
    }

    let cheapOptions: CheapOption[] = [];
    if (cheapRes.status === "fulfilled" && cheapRes.value.ok) {
      const json = await cheapRes.value.json();
      cheapOptions = normalizeCheapOptions(json);
    }

    if (!latest && cheapOptions.length === 0) {
      const bothFailed = latestRes.status === "rejected" && cheapRes.status === "rejected";
      if (bothFailed) {
        return jsonResponse({
          success: false,
          error: { code: "UPSTREAM_TIMEOUT", message: "No se pudo conectar con Aviasales" },
        });
      }
      return jsonResponse({
        success: false,
        error: { code: "NO_OFFERS", message: "No encontramos vuelos para esta ruta" },
      });
    }

    // URL de resultados de Aviasales (formato de token oficial ORIGEN+DDMM+
    // DESTINO+pasajeros, confirmado real). Un link armado a mano acá pierde
    // el marker al abrirse (probado con curl: redirige a la home en ruso
    // sin parámetros) — por eso más abajo se pasa por la API de Enlaces de
    // Travelpayouts, que es quien realmente arma el link trackeado.
    const departToken = latest?.departDate ? toDDMM(latest.departDate) : defaultDepartDateDDMM();
    const searchToken = `${origin}${departToken}${destination}1`;
    const innerUrl = `https://www.aviasales.com/search/${searchToken}?locale=${locale}`;

    // Fallback si la API de Enlaces falla: mejor un link con el marker
    // simple (confirmado válido: es el mismo formato de las landing pages
    // prediseñadas de Travelpayouts) que no tener ningún link.
    let deepLink = `${innerUrl}&marker=${marker}`;

    try {
      const linkRes = await fetchWithTimeout(
        "https://api.travelpayouts.com/links/v1/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Access-Token": token,
          },
          body: JSON.stringify({
            trs: TRAVELPAYOUTS_TRS,
            marker: /^\d+$/.test(marker) ? Number(marker) : marker,
            shorten: true,
            links: [{ url: innerUrl }],
          }),
        },
        6000
      );
      if (linkRes.ok) {
        const linkJson = await linkRes.json().catch(() => null);
        const partnerUrl = linkJson?.result?.links?.[0]?.partner_url;
        if (typeof partnerUrl === "string" && partnerUrl) {
          deepLink = partnerUrl;
        }
      }
    } catch (e) {
      console.error("Error al generar link trackeado, se usa el fallback:", e);
    }

    return jsonResponse({
      success: true,
      data: { latest, cheapOptions, deepLink },
    });
  } catch (e) {
    return jsonResponse({
      success: false,
      error: {
        code: "UPSTREAM_ERROR",
        message: e instanceof Error ? e.message : "Error desconocido",
      },
    });
  }
});
