import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "./cors.ts";

// Fijo el modelo explícito en vez del alias "gemini-flash-latest": ese alias
// puede re-apuntarse a un modelo más caro sin aviso (ya pasó en jul 2026).
// Si "gemini-3.5-flash" se retira más adelante, hay que actualizar acá a mano.
const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ESTILOS_VALIDOS = [
  "familiar",
  "cultural",
  "gastronomico",
  "bajo_presupuesto",
  "aventura",
];

const PROMPT_INTRO: Record<string, string> = {
  es: "Sos un guía turístico experto en Buenos Aires. Armá un itinerario día por día usando ÚNICAMENTE los lugares de la siguiente lista (usá su poi_id exacto, no inventes lugares ni ids). Ordená las paradas de cada día pensando en la cercanía geográfica entre sí, para minimizar caminata. Respondé en español.",
  en: "You are an expert Buenos Aires tour guide. Build a day-by-day itinerary using ONLY the places in the following list (use their exact poi_id, do not invent places or ids). Order each day's stops by geographic proximity to minimize walking. Respond in English.",
  pt: "Você é um guia turístico especialista em Buenos Aires. Monte um roteiro dia a dia usando APENAS os lugares da lista a seguir (use o poi_id exato, não invente lugares ou ids). Ordene as paradas de cada dia pela proximidade geográfica entre si, para minimizar caminhada. Responda em português.",
};

const ESTILO_LABELS: Record<string, Record<string, string>> = {
  es: {
    familiar: "familiar",
    cultural: "cultural",
    gastronomico: "gastronómico",
    bajo_presupuesto: "bajo presupuesto",
    aventura: "aventura",
  },
  en: {
    familiar: "family-friendly",
    cultural: "cultural",
    gastronomico: "food & dining",
    bajo_presupuesto: "budget",
    aventura: "adventure",
  },
  pt: {
    familiar: "família",
    cultural: "cultural",
    gastronomico: "gastronômico",
    bajo_presupuesto: "baixo orçamento",
    aventura: "aventura",
  },
};

const responseSchema = {
  type: "OBJECT",
  properties: {
    dias: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          dia: { type: "INTEGER" },
          titulo: { type: "STRING" },
          paradas: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                poi_id: { type: "STRING" },
                horario_sugerido: { type: "STRING" },
                motivo: { type: "STRING" },
              },
              required: ["poi_id"],
            },
          },
        },
        required: ["dia", "paradas"],
      },
    },
  },
  required: ["dias"],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const days = Number(body?.days);
    const lang: string = ["es", "en", "pt"].includes(body?.lang)
      ? body.lang
      : "es";
    const styles: string[] = Array.isArray(body?.styles)
      ? body.styles.filter((s: unknown) => ESTILOS_VALIDOS.includes(s as string))
      : [];

    if (!Number.isInteger(days) || days < 1 || days > 7) {
      return jsonResponse({
        success: false,
        error: { code: "INVALID_INPUT", message: "days debe ser un entero entre 1 y 7" },
      });
    }
    if (styles.length === 0) {
      return jsonResponse({
        success: false,
        error: { code: "INVALID_INPUT", message: "styles no puede estar vacío" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return jsonResponse({
        success: false,
        error: { code: "NOT_CONFIGURED", message: "GEMINI_API_KEY no está configurada" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const descCol =
      lang === "en" ? "descripcion_en" : lang === "pt" ? "descripcion_pt" : "descripcion_es";

    const { data: pois, error: dbError } = await supabase
      .from("puntos_interes")
      .select(`id, nombre, categoria, lat, lng, descripcion_es, ${descCol}`);

    if (dbError || !pois || pois.length === 0) {
      return jsonResponse({
        success: false,
        error: {
          code: "UPSTREAM_ERROR",
          message: dbError?.message ?? "No se pudieron cargar los lugares",
        },
      });
    }

    const validIds = new Set(pois.map((p: any) => p.id as string));

    const listado = pois
      .map((p: any) => {
        const desc = (p[descCol] ?? p.descripcion_es ?? "").toString().slice(0, 120);
        return `- poi_id=${p.id} | ${p.nombre} | ${p.categoria} | lat=${p.lat},lng=${p.lng} | ${desc}`;
      })
      .join("\n");

    const estilosTexto = styles
      .map((s) => ESTILO_LABELS[lang]?.[s] ?? s)
      .join(", ");

    const promptText = `${PROMPT_INTRO[lang]}\n\nDías: ${days}\nEstilo de viaje: ${estilosTexto}\n\nLugares disponibles:\n${listado}`;

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    });

    if (geminiRes.status === 429) {
      return jsonResponse({
        success: false,
        error: { code: "RATE_LIMITED", message: "Cuota de Gemini agotada por ahora" },
      });
    }
    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      return jsonResponse({
        success: false,
        error: {
          code: "UPSTREAM_ERROR",
          message: `Gemini ${geminiRes.status}: ${errText.slice(0, 200)}`,
        },
      });
    }

    const geminiJson = await geminiRes.json();
    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return jsonResponse({
        success: false,
        error: { code: "PARSE_ERROR", message: "Respuesta vacía del modelo" },
      });
    }

    let parsed: { dias?: any[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return jsonResponse({
        success: false,
        error: { code: "PARSE_ERROR", message: "No se pudo interpretar la respuesta del modelo" },
      });
    }

    // Gemini puede alucinar poi_id pese al responseSchema: se descarta
    // cualquier parada que no exista realmente en la base.
    const diasValidados = (parsed.dias ?? [])
      .map((d: any) => ({
        dia: Number(d?.dia) || 0,
        titulo: typeof d?.titulo === "string" ? d.titulo : "",
        paradas: Array.isArray(d?.paradas)
          ? d.paradas.filter((p: any) => typeof p?.poi_id === "string" && validIds.has(p.poi_id))
          : [],
      }))
      .filter((d: any) => d.paradas.length > 0);

    if (diasValidados.length === 0) {
      return jsonResponse({
        success: false,
        error: { code: "NO_RESULTS", message: "El modelo no devolvió paradas válidas" },
      });
    }

    return jsonResponse({ success: true, data: { dias: diasValidados } });
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
