// Listas curadas de rutas para la pestaña de Vuelos (Mejora 2). No es
// contenido editorial que necesite CMS/base de datos, así que vive como
// constante fija en el código, igual que las rutas/íconos hardcodeados de
// BottomNavBar.

export interface FlightRoute {
  iata: string;
  label: string;
  subtitle: string;
}

// Excursiones típicas de un turista que ya está en Buenos Aires.
export const DESTINOS_DESDE_BA: FlightRoute[] = [
  { iata: "IGR", label: "Iguazú", subtitle: "Misiones" },
  { iata: "BRC", label: "Bariloche", subtitle: "Río Negro" },
  { iata: "MDZ", label: "Mendoza", subtitle: "Cuyo" },
  { iata: "FTE", label: "El Calafate", subtitle: "Santa Cruz" },
  { iata: "USH", label: "Ushuaia", subtitle: "Tierra del Fuego" },
  { iata: "SLA", label: "Salta", subtitle: "Noroeste" },
  { iata: "COR", label: "Córdoba", subtitle: "Centro" },
];

// Ciudades de origen más frecuentes para quien todavía no llegó a Buenos Aires.
export const ORIGENES_HACIA_BA: FlightRoute[] = [
  { iata: "SAO", label: "São Paulo", subtitle: "Brasil" },
  { iata: "SCL", label: "Santiago", subtitle: "Chile" },
  { iata: "MAD", label: "Madrid", subtitle: "España" },
  { iata: "MIA", label: "Miami", subtitle: "Estados Unidos" },
  { iata: "NYC", label: "Nueva York", subtitle: "Estados Unidos" },
  { iata: "ROM", label: "Roma", subtitle: "Italia" },
];
