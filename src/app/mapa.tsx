import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLang } from "../context/LangContext";
import { useLocation } from "../context/LocationContext";
import { supabase } from "../lib/supabase";
import { useAppTheme } from "../theme/colors";

const traducciones = {
  es: {
    titulo: "Mapa de la ciudad",
    subtitulo: "puntos de interés",
    rutaHacia: "Ruta a",
    comunas: [
      "Todas las comunas",
      "Comuna 1 (Centro/San Telmo)",
      "Comuna 2 (Recoleta)",
      "Comuna 3 (Balvanera/Abasto)",
      "Comuna 4 (La Boca/Barracas)",
      "Comuna 5 (Almagro/Boedo)",
      "Comuna 6 (Caballito)",
      "Comuna 7 (Flores)",
      "Comuna 8 (Lugano)",
      "Comuna 9 (Mataderos/Liniers)",
      "Comuna 10 (Villa Luro)",
      "Comuna 11 (Devoto)",
      "Comuna 12 (Saavedra)",
      "Comuna 13 (Belgrano/Núñez)",
      "Comuna 14 (Palermo)",
      "Comuna 15 (Villa Crespo/Chacarita)",
    ],
    leyenda: {
      edificio: "Edificio histórico",
      parque: "Parque",
      museo: "Museo",
      teatro: "Teatro / Cancha",
      zona: "Zona turística",
    },
    cargando: "Cargando mapa...",
    nav: ["Inicio", "Mapa", "Transporte", "Resto", "Recorrido"],
    estacionesLabel: "estaciones",
    combinaCon: "Combina con",
    leyendaTransporte: {
      seleccionada: "Línea seleccionada",
      otras: "Otras líneas (combinación)",
    },
  },
  en: {
    titulo: "City Map",
    subtitulo: "points of interest",
    rutaHacia: "Route to",
    comunas: [
      "All communes",
      "Commune 1 (Downtown)",
      "Commune 2 (Recoleta)",
      "Commune 3 (Balvanera)",
      "Commune 4 (La Boca)",
      "Commune 5 (Almagro)",
      "Commune 6 (Caballito)",
      "Commune 7 (Flores)",
      "Commune 8 (Lugano)",
      "Commune 9 (Mataderos)",
      "Commune 10 (Villa Luro)",
      "Commune 11 (Devoto)",
      "Commune 12 (Saavedra)",
      "Commune 13 (Belgrano)",
      "Commune 14 (Palermo)",
      "Commune 15 (Villa Crespo)",
    ],
    leyenda: {
      edificio: "Historic building",
      parque: "Park",
      museo: "Museum",
      teatro: "Theater / Stadium",
      zona: "Tourist zone",
    },
    cargando: "Loading map...",
    nav: ["Home", "Map", "Transit", "Dining", "Itinerary"],
    estacionesLabel: "stations",
    combinaCon: "Connects with",
    leyendaTransporte: {
      seleccionada: "Selected line",
      otras: "Other lines (transfer)",
    },
  },
};

const getMarkerColor = (categoria: string) => {
  switch (categoria) {
    case "Museos":
      return "#C9542A";
    case "Parques":
      return "#3F6B4F";
    case "Edificios historicos":
      return "#1F4778";
    case "Teatros":
    case "Canchas de futbol":
      return "#7C5FA8";
    case "Zonas turisticas":
    case "Cupulas":
      return "#E0A23A";
    default:
      return "#5B6270";
  }
};

// --- Tipos y helpers para el modo "línea de transporte" ---
// (No modifican la lógica existente de puntos de interés, solo se suman)

interface CoordPoint {
  latitude: number;
  longitude: number;
}

interface EstacionJson {
  nombre: string;
}

interface LineaTransporte {
  id: string;
  tipo: "subte" | "tren" | "bus";
  nombre: string;
  color: string;
  coordenadas: CoordPoint[] | null;
  estaciones_json: EstacionJson[] | null;
}

interface EstacionConCoord {
  nombre: string;
  latitude: number;
  longitude: number;
}

// Saca tildes/mayúsculas para poder comparar nombres de estación entre líneas
// (ej: "San José de Flores" vs "San Jose de Flores")
const normalizarTexto = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// El nombre de cada estación viene en "estaciones_json" y su lat/lng en
// "coordenadas", en el MISMO ORDEN (uno a uno). Si no coinciden en cantidad
// (por ejemplo, líneas de bus que no tienen estaciones_json cargado),
// devolvemos [] y esa línea se dibuja solo como trazado, sin nombres.
const getEstacionesConCoord = (linea: LineaTransporte): EstacionConCoord[] => {
  if (
    !linea.estaciones_json ||
    !linea.coordenadas ||
    linea.estaciones_json.length !== linea.coordenadas.length
  ) {
    return [];
  }
  return linea.estaciones_json.map((estacion, index) => ({
    nombre: estacion.nombre,
    latitude: linea.coordenadas![index].latitude,
    longitude: linea.coordenadas![index].longitude,
  }));
};

// Región que encuadra toda una línea (para hacer zoom automático a su recorrido)
const calcularRegionDeLinea = (estaciones: EstacionConCoord[]) => {
  const lats = estaciones.map((e) => e.latitude);
  const lngs = estaciones.map((e) => e.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padding = 1.4;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * padding, 0.02),
    longitudeDelta: Math.max((maxLng - minLng) * padding, 0.02),
  };
};

export default function MapaScreen() {
  const theme = useAppTheme();
  const { lang } = useLang();
  const t = traducciones[lang];
  const router = useRouter();

  // Recibimos parámetros de la pantalla de detalle y el GPS
  const {
    destinoLat,
    destinoLng,
    destinoNombre,
    transporteId,
    transporteNombre,
  } = useLocalSearchParams();
  const { location } = useLocation();

  const [comunaActiva, setComunaActiva] = useState(0);
  const [lugares, setLugares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para el modo "línea de transporte" (viene de la pantalla de Transporte)
  const [lineasTransporte, setLineasTransporte] = useState<LineaTransporte[]>(
    [],
  );
  const [loadingTransporte, setLoadingTransporte] = useState(true);

  // Estados para el "Modo Ruta"
  const [destinoActivo, setDestinoActivo] = useState<{
    lat: number;
    lng: number;
    nombre: string;
  } | null>(null);
  const [rutaCaminando, setRutaCaminando] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  // 1. Efecto para inicializar el Modo Ruta si venimos del Detalle
  useEffect(() => {
    if (destinoLat && destinoLng) {
      setDestinoActivo({
        lat: Number(destinoLat),
        lng: Number(destinoLng),
        nombre: destinoNombre as string,
      });
      setComunaActiva(0); // Reiniciamos el filtro de comunas
    } else {
      setDestinoActivo(null);
      setRutaCaminando([]);
    }
  }, [destinoLat, destinoLng, destinoNombre]);

  // 2. Efecto para calcular la ruta peatonal calle por calle usando OSRM
  useEffect(() => {
    const fetchRuta = async () => {
      if (location && destinoActivo) {
        try {
          const originLon = location.coords.longitude;
          const originLat = location.coords.latitude;
          const destLon = destinoActivo.lng;
          const destLat = destinoActivo.lat;

          // API gratuita de ruteo (foot = caminando)
          const url = `https://router.project-osrm.org/route/v1/foot/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson`;

          const response = await fetch(url);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates;
            // OSRM devuelve [Longitud, Latitud], React Native Maps usa [Latitud, Longitud]
            const formattedCoords = coords.map((c: [number, number]) => ({
              latitude: c[1],
              longitude: c[0],
            }));
            setRutaCaminando(formattedCoords);
          }
        } catch (error) {
          console.error("Error al obtener la ruta:", error);
        }
      }
    };

    fetchRuta();
  }, [location, destinoActivo]);

  // 3. Cargar todos los puntos de interés desde Supabase
  useEffect(() => {
    const fetchMapa = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("puntos_interes")
          .select("id, nombre, categoria, comuna, lat, lng");

        if (error) throw error;
        setLugares(data || []);
      } catch (error) {
        console.error("Error al cargar mapa:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMapa();
  }, []);

  // 4. Cargar todas las líneas de transporte (subte/tren/bus) para el modo "línea seleccionada"
  useEffect(() => {
    const fetchTransportes = async () => {
      setLoadingTransporte(true);
      try {
        const { data, error } = await supabase
          .from("transporte")
          .select("id, tipo, nombre, color, coordenadas, estaciones_json");
        if (error) throw error;
        setLineasTransporte((data as LineaTransporte[]) || []);
      } catch (error) {
        console.error("Error al cargar líneas de transporte:", error);
      } finally {
        setLoadingTransporte(false);
      }
    };
    fetchTransportes();
  }, []);

  // Línea actualmente seleccionada (si venimos desde la pantalla de Transporte)
  const transporteIdParam = Array.isArray(transporteId)
    ? transporteId[0]
    : transporteId;

  const lineaSeleccionada = transporteIdParam
    ? (lineasTransporte.find((l) => l.id === transporteIdParam) ?? null)
    : null;

  const estacionesSeleccionada = useMemo(
    () => (lineaSeleccionada ? getEstacionesConCoord(lineaSeleccionada) : []),
    [lineaSeleccionada],
  );

  // Nombres de estación de la línea seleccionada, normalizados, para detectar combinaciones
  const nombresSeleccionadaSet = useMemo(
    () => new Set(estacionesSeleccionada.map((e) => normalizarTexto(e.nombre))),
    [estacionesSeleccionada],
  );

  // El resto de las líneas: se muestran atenuadas, solo a modo informativo
  const lineasNoSeleccionadas = useMemo(
    () =>
      lineaSeleccionada
        ? lineasTransporte.filter((l) => l.id !== lineaSeleccionada.id)
        : [],
    [lineasTransporte, lineaSeleccionada],
  );

  // Lógica de Filtrado Inteligente:
  // Si hay ruta activa, mostramos SOLO ese lugar. Si no, filtramos por comuna.
  const lugaresMostrados = destinoActivo
    ? lugares.filter((lugar) => lugar.nombre === destinoActivo.nombre)
    : comunaActiva === 0
      ? lugares
      : lugares.filter((lugar) => lugar.comuna === comunaActiva);

  // Prioridad de encuadre: 1) ruta caminando a un destino puntual (ya existente),
  // 2) línea de transporte seleccionada (nueva), 3) vista general de la ciudad (ya existente).
  const regionInicial = destinoActivo
    ? {
        latitude: destinoActivo.lat,
        longitude: destinoActivo.lng,
        latitudeDelta: 0.02, // Más zoom si hay destino
        longitudeDelta: 0.02,
      }
    : lineaSeleccionada && estacionesSeleccionada.length > 0
      ? calcularRegionDeLinea(estacionesSeleccionada)
      : {
          latitude: -34.6037,
          longitude: -58.3816,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}
      >
        <View>
          <Text style={styles.chapaTitle}>{t.titulo}</Text>
          {/* Mostramos el texto adecuado según si estamos navegando o explorando */}
          <Text style={styles.chapaSub}>
            {destinoActivo
              ? `🚶 ${t.rutaHacia} ${destinoActivo.nombre}`
              : lineaSeleccionada
                ? `🚇 ${lineaSeleccionada.nombre} · ${estacionesSeleccionada.length || lineaSeleccionada.coordenadas?.length || 0} ${t.estacionesLabel}`
                : transporteIdParam
                  ? `🚇 ${typeof transporteNombre === "string" ? transporteNombre : ""}`
                  : `${lugaresMostrados.length} ${t.subtitulo}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="filter-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Scroll Horizontal de Comunas: no aplica en Modo Transporte, ahí no importan las comunas */}
        {!lineaSeleccionada && (
          <View style={styles.chipContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
            >
              {t.comunas.map((comunaLabel, index) => {
                // Si estamos en "Modo Ruta", desactivamos visualmente todos los chips menos el primero
                const isSelected = !destinoActivo && comunaActiva === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.chip,
                      isSelected
                        ? {
                            backgroundColor: theme.colors.primary,
                            borderColor: theme.colors.primary,
                          }
                        : { borderColor: theme.colors.border },
                    ]}
                    onPress={() => {
                      // Si el usuario toca un filtro, apagamos el Modo Ruta y filtramos el mapa normal
                      setDestinoActivo(null);
                      setRutaCaminando([]);
                      setComunaActiva(index);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected
                          ? { color: "#fff" }
                          : { color: theme.colors.textSecondary },
                      ]}
                    >
                      {comunaLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
        <View
          style={[styles.mapContainer, { borderColor: theme.colors.border }]}
        >
          {loading || (transporteIdParam && loadingTransporte) ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={{ marginTop: 10, color: theme.colors.textSecondary }}
              >
                {t.cargando}
              </Text>
            </View>
          ) : (
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={regionInicial}
              showsUserLocation={true}
            >
              {/* Puntos de interés: se ocultan en Modo Transporte para no saturar el mapa
                  (con el recorrido de la línea, ver museos/parques encima lo hace ilegible) */}
              {!lineaSeleccionada &&
                lugaresMostrados.map((lugar) => {
                  if (!lugar.lat || !lugar.lng) return null;
                  return (
                    <Marker
                      key={lugar.id}
                      coordinate={{ latitude: lugar.lat, longitude: lugar.lng }}
                      pinColor={getMarkerColor(lugar.categoria)}
                      title={lugar.nombre}
                      description={String(lugar.categoria).toUpperCase()}
                    />
                  );
                })}

              {/* Dibujamos la ruta peatonal calle por calle si existe */}
              {rutaCaminando.length > 0 && (
                <Polyline
                  coordinates={rutaCaminando}
                  strokeColor={theme.colors.primary}
                  strokeWidth={4}
                  lineDashPattern={[6, 6]} // Línea punteada
                />
              )}

              {/* --- MODO LÍNEA DE TRANSPORTE (nuevo, no toca lo de arriba) --- */}
              {lineaSeleccionada && (
                <>
                  {/* Otras líneas: atenuadas y punteadas, solo a modo informativo/combinación */}
                  {lineasNoSeleccionadas.map((linea) => {
                    if (!linea.coordenadas || linea.coordenadas.length === 0) {
                      return null;
                    }
                    const estacionesOtra = getEstacionesConCoord(linea);
                    const puntosCombinacion = estacionesOtra.filter(
                      (estacion) =>
                        nombresSeleccionadaSet.has(
                          normalizarTexto(estacion.nombre),
                        ),
                    );
                    return (
                      <React.Fragment key={linea.id}>
                        <Polyline
                          coordinates={linea.coordenadas}
                          strokeColor={hexToRgba(linea.color, 0.75)}
                          strokeWidth={3.5}
                          lineDashPattern={[10, 6]}
                        />
                        {puntosCombinacion.map((estacion, idx) => (
                          <Marker
                            key={`${linea.id}-comb-${idx}`}
                            coordinate={{
                              latitude: estacion.latitude,
                              longitude: estacion.longitude,
                            }}
                            title={estacion.nombre}
                            description={`${t.combinaCon} ${linea.nombre}`}
                            tracksViewChanges={false}
                          >
                            <View style={styles.combinacionMarker}>
                              <View
                                style={[
                                  styles.combinacionDot,
                                  { borderColor: linea.color },
                                ]}
                              />
                            </View>
                          </Marker>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {/* Línea seleccionada: recorrido completo destacado + nombre de cada estación */}
                  {lineaSeleccionada.coordenadas && (
                    <Polyline
                      coordinates={lineaSeleccionada.coordenadas}
                      strokeColor={lineaSeleccionada.color}
                      strokeWidth={5}
                    />
                  )}
                  {estacionesSeleccionada.map((estacion, idx) => (
                    <Marker
                      key={`${lineaSeleccionada.id}-est-${idx}`}
                      coordinate={{
                        latitude: estacion.latitude,
                        longitude: estacion.longitude,
                      }}
                      anchor={{ x: 0.5, y: 1 }}
                      tracksViewChanges={false}
                    >
                      <View style={styles.estacionMarkerWrap}>
                        <View style={styles.estacionLabel}>
                          <Text
                            style={styles.estacionLabelText}
                            numberOfLines={1}
                          >
                            {estacion.nombre}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.estacionDot,
                            { backgroundColor: lineaSeleccionada.color },
                          ]}
                        />
                      </View>
                    </Marker>
                  ))}
                </>
              )}
            </MapView>
          )}
        </View>

        {/* Leyenda de la línea de transporte seleccionada (nueva, independiente de la de POIs) */}
        {lineaSeleccionada && (
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendLine,
                  { backgroundColor: lineaSeleccionada.color },
                ]}
              />
              <Text style={styles.legendText}>
                {t.leyendaTransporte.seleccionada}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendLineMuted} />
              <Text style={styles.legendText}>{t.leyendaTransporte.otras}</Text>
            </View>
          </View>
        )}

        {/* Ocultamos la leyenda de colores de POIs si estamos en Modo Ruta o Modo Transporte */}
        {!destinoActivo && !lineaSeleccionada && (
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#1F4778" }]}
              />
              <Text style={styles.legendText}>{t.leyenda.edificio}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#3F6B4F" }]}
              />
              <Text style={styles.legendText}>{t.leyenda.parque}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#C9542A" }]}
              />
              <Text style={styles.legendText}>{t.leyenda.museo}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#7C5FA8" }]}
              />
              <Text style={styles.legendText}>{t.leyenda.teatro}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#E0A23A" }]}
              />
              <Text style={styles.legendText}>{t.leyenda.zona}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.bottomNav, { borderColor: theme.colors.border }]}>
        {t.nav.map((item, index) => {
          const navIcons = [
            "home-outline",
            "map",
            "bus-outline",
            "restaurant-outline",
            "list-outline",
          ];
          const isActive = index === 1;
          return (
            <TouchableOpacity
              key={index}
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => {
                if (index === 0) router.push("/inicio");
                if (index === 2) router.push("/transporte");
              }}
            >
              <Ionicons
                name={isActive ? "map" : (navIcons[index] as any)}
                size={22}
                color={
                  isActive ? theme.colors.primary : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.navText,
                  isActive && { color: theme.colors.primary },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chapaBar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chapaTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  chapaSub: {
    fontSize: 11,
    color: "#C7D2E3",
    marginTop: 2,
    fontFamily: "monospace",
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { flex: 1, paddingHorizontal: 18 },
  chipContainer: { marginVertical: 12, height: 36 },
  chipScroll: { paddingRight: 18, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  chipText: { fontSize: 11.5, fontWeight: "600" },
  mapContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 12,
    backgroundColor: "#E4DFCF",
  },
  map: { width: "100%", height: "100%" },
  loadingWrapper: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 4.5 },
  legendText: { fontSize: 10.5, color: "#5B6270", fontWeight: "600" },
  legendLine: { width: 18, height: 4, borderRadius: 2 },
  legendLineMuted: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#8B8F7E",
    opacity: 0.75,
  },
  estacionMarkerWrap: { alignItems: "center" },
  estacionLabel: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#D9D2BC",
    marginBottom: 2,
    maxWidth: 120,
  },
  estacionLabelText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#1B2330",
    fontFamily: "monospace",
  },
  estacionDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  combinacionMarker: { alignItems: "center", justifyContent: "center" },
  combinacionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    borderWidth: 3,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  navItem: { flex: 1, alignItems: "center", gap: 3 },
  navText: { fontSize: 8.5, fontWeight: "bold", color: "#8B8F7E" },
});
