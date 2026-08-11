import { supabase } from "./supabase";
import {
  EdgeFunctionResult,
  FlightsSearchData,
  FlightsSearchRequest,
  HotelLinkData,
  HotelLinkRequest,
  ItineraryGenerateData,
  ItineraryGenerateRequest,
} from "../types/travel";

// Las Edge Functions siempre devuelven HTTP 200 con el resultado (éxito o
// error de negocio) en el body como { success, data | error } — así evitamos
// la complejidad de parsear el body de una respuesta no-2xx desde
// supabase-js. Un `error` acá solo pasa por una falla de transporte real
// (sin red, timeout, function caída), no por un error "esperado" como rate
// limit o sin resultados.
async function invokeEdgeFunction<T>(
  name: string,
  body: object
): Promise<EdgeFunctionResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) {
      return {
        success: false,
        error: { code: "TRANSPORT_ERROR", message: error.message },
      };
    }
    return data as EdgeFunctionResult<T>;
  } catch (e: any) {
    return {
      success: false,
      error: { code: "TRANSPORT_ERROR", message: e?.message ?? "Unknown error" },
    };
  }
}

export const searchFlights = (req: FlightsSearchRequest) =>
  invokeEdgeFunction<FlightsSearchData>("flights-search", req);

export const generateItinerary = (req: ItineraryGenerateRequest) =>
  invokeEdgeFunction<ItineraryGenerateData>("itinerary-generate", req);

export const getHotelLink = (req: HotelLinkRequest) =>
  invokeEdgeFunction<HotelLinkData>("hotel-link", req);
