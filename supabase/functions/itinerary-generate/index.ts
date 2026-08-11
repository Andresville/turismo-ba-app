import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "./cors.ts";

// Fijo el modelo explícito en vez del alias "gemini-flash-latest": ese alias
// puede re-apuntarse a un modelo más caro sin aviso (ya pasó en jul 2026).
// Si "gemini-3.5-flash" se retira más adelante, hay que actualizar acá a mano.
const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ESTILOS_VALIDOS = [
  "cultural",
  "gastronomico",
  "bajo_presupuesto",
  "aventura",
  "deportivo",
  "aire_libre",
  "museos",
];

const PROMPT_INTRO: Record<string, string> = {
  es: "Sos un guía turístico experto en Buenos Aires. Armá un itinerario día por día usando ÚNICAMENTE los lugares de la siguiente lista (usá su poi_id exacto, no inventes lugares ni ids). Ordená las paradas de cada día pensando en la cercanía geográfica entre sí, para minimizar caminata. Respondé en español.",
  en: "You are an expert Buenos Aires tour guide. Build a day-by-day itinerary using ONLY the places in the following list (use their exact poi_id, do not invent places or ids). Order each day's stops by geographic proximity to minimize walking. Respond in English.",
  pt: "Você é um guia turístico especialista em Buenos Aires. Monte um roteiro dia a dia usando APENAS os lugares da lista a seguir (use o poi_id exato, não invente lugares ou ids). Ordene as paradas de cada dia pela proximidade geográfica entre si, para minimizar caminhada. Responda em português.",
};

const ESTILO_LABELS: Record<string, Record<string, string>> = {
  es: {
    cultural: "cultural",
    gastronomico: "gastronómico",
    bajo_presupuesto: "bajo presupuesto",
    aventura: "aventura",
    deportivo: "deportivo",
    aire_libre: "aire libre",
    museos: "museos",
  },
  en: {
    cultural: "cultural",
    gastronomico: "food & dining",
    bajo_presupuesto: "budget",
    aventura: "adventure",
    deportivo: "sports",
    aire_libre: "outdoors",
    museos: "museums",
  },
  pt: {
    cultural: "cultural",
    gastronomico: "gastronômico",
    bajo_presupuesto: "baixo orçamento",
    aventura: "aventura",
    deportivo: "esportivo",
    aire_libre: "ao ar livre",
    museos: "museus",
  },
};

// Instrucción extra por estilo, para que el modelo no tenga que adivinar qué
// categoría privilegiar solo a partir de la etiqueta. La categoría de cada
// lugar viaja en el listado tal cual está en la base (en español, sin
// traducir), así que estas pistas referencian los nombres literales
// ("Deportes", "Parques", etc.) sin importar el idioma de respuesta.
// "cultural" y "gastronomico" quedan sin pista: cultural ya es amplio de por
// sí (museos, teatros, edificios históricos, cúpulas), y gastronómico no
// tiene con qué reforzarse porque los restaurantes no viajan en este listado
// (solo se consulta puntos_interes, no restaurantes).
const STYLE_HINTS: Record<string, Record<string, string>> = {
  deportivo: {
    es: 'Priorizá los lugares con categoría "Deportes" (estadios, autódromo, velódromo, clubes, hipódromo, campo de polo).',
    en: 'Prioritize places with category "Deportes" (stadiums, racetrack, velodrome, sports clubs, hippodrome, polo field).',
    pt: 'Priorize os lugares com categoria "Deportes" (estádios, autódromo, velódromo, clubes, hipódromo, campo de polo).',
  },
  aire_libre: {
    es: 'Priorizá los lugares con categoría "Parques" (plazas, jardines, reservas) para pasar el día al aire libre.',
    en: 'Prioritize places with category "Parques" (squares, gardens, reserves) to spend the day outdoors.',
    pt: 'Priorize os lugares com categoria "Parques" (praças, jardins, reservas) para passar o dia ao ar livre.',
  },
  museos: {
    es: 'Priorizá los lugares con categoría "Museos" para armar un recorrido centrado en museos.',
    en: 'Prioritize places with category "Museos" to build a museum-focused route.',
    pt: 'Priorize os lugares com categoria "Museos" para montar um roteiro focado em museus.',
  },
  bajo_presupuesto: {
    es: 'Priorizá lugares gratuitos o de bajo costo, como los de categoría "Parques" y "Zonas turisticas" (plazas, ferias, paseos al aire libre), por sobre museos o atracciones pagas.',
    en: 'Prioritize free or low-cost places, such as those in the "Parques" and "Zonas turisticas" categories (squares, fairs, outdoor walks), over paid museums or attractions.',
    pt: 'Priorize lugares gratuitos ou de baixo custo, como os das categorias "Parques" e "Zonas turisticas" (praças, feiras, passeios ao ar livre), em vez de museus ou atrações pagas.',
  },
  aventura: {
    es: 'Priorizá lugares para actividad física y al aire libre, como los de categoría "Parques" (Reserva Ecológica, Jardín Botánico) y "Deportes" (velódromo, autódromo, clubes).',
    en: 'Prioritize places for physical, outdoor activity, such as those in the "Parques" (Ecological Reserve, Botanical Garden) and "Deportes" (velodrome, racetrack, sports clubs) categories.',
    pt: 'Priorize lugares para atividade física e ao ar livre, como os das categorias "Parques" (Reserva Ecológica, Jardim Botânico) e "Deportes" (velódromo, autódromo, clubes).',
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

    const hints = styles
      .map((s) => STYLE_HINTS[s]?.[lang])
      .filter((h): h is string => Boolean(h));
    const hint = hints.length > 0 ? `\n\n${hints.join(" ")}` : "";
    const promptText = `${PROMPT_INTRO[lang]}\n\nDías: ${days}\nEstilo de viaje: ${estilosTexto}${hint}\n\nLugares disponibles:\n${listado}`;

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
