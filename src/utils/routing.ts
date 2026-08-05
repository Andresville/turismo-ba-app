// OpenRouteService: a diferencia del servidor demo público de OSRM (que solo
// tiene el grafo de auto y respeta calles de un solo sentido pensadas para
// vehículos), este perfil "foot-walking" es un ruteo peatonal real.
const ORS_API_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY;

interface Point {
  lat: number;
  lng: number;
}

// Dado un conjunto de puntos en orden (2 o más), devuelve las coordenadas de
// la ruta a pie que los conecta en ese mismo orden, o null si falla / no hay
// API key configurada (para que el llamador pueda usar un fallback).
export const fetchWalkingRoute = async (
  points: Point[]
): Promise<{ latitude: number; longitude: number }[] | null> => {
  if (!ORS_API_KEY || points.length < 2) return null;

  try {
    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
      {
        method: "POST",
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: points.map((p) => [p.lng, p.lat]),
        }),
      }
    );

    if (!response.ok) {
      console.error("Error de OpenRouteService:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (!coords) return null;

    return coords.map((c: [number, number]) => ({
      latitude: c[1],
      longitude: c[0],
    }));
  } catch (error) {
    console.error("Error al calcular ruta peatonal (OpenRouteService):", error);
    return null;
  }
};
