import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "./cors.ts";

const TIMEOUT_MS = 8000;

// Mismo "trs" (traffic source) que flights-search — es el ID del proyecto
// "Aplicación móvil" del usuario en Travelpayouts, no un secreto.
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const locale = ["es", "en", "pt"].includes(body?.lang) ? body.lang : "es";

    const token = Deno.env.get("TRAVELPAYOUTS_TOKEN");
    const marker = Deno.env.get("TRAVELPAYOUTS_MARKER");
    if (!token || !marker) {
      return jsonResponse({
        success: false,
        error: { code: "NOT_CONFIGURED", message: "Credenciales de Travelpayouts no configuradas" },
      });
    }

    // Aviasales muestra un buscador de hoteles (basado en Booking.com) dentro
    // de su propio sitio, sin requerir parámetros de ciudad/fecha para
    // aterrizar en él — el usuario los completa ahí mismo.
    const innerUrl = `https://www.aviasales.com/hotels?locale=${locale}`;

    // Fallback si la API de Enlaces falla: link con el marker simple (mismo
    // formato ya validado en flights-search) antes que no tener ningún link.
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

    return jsonResponse({ success: true, data: { deepLink } });
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
