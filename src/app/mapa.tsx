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

import BottomNavBar from "../components/BottomNavBar";
import { useItinerary } from "../context/ItineraryContext";
import { useLang } from "../context/LangContext";
import { useLocation } from "../context/LocationContext";
import { supabase } from "../lib/supabase";
import { useAppTheme } from "../theme/colors";

const traducciones = {
  es: {
    titulo: "Mapa de la ciudad",
    subtitulo: "puntos de interés",
    rutaHacia: "Ruta a",
    itinerarioActivo: "Circuito de tu recorrido",
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
  },
  en: {
    titulo: "City Map",
    subtitulo: "points of interest",
    rutaHacia: "Route to",
    itinerarioActivo: "Your custom tour route",
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

export default function MapaScreen() {
  const theme = useAppTheme();
  const { lang } = useLang();
  const t = traducciones[lang as keyof typeof traducciones] || traducciones.es;
  const router = useRouter();

  const { destinoLat, destinoLng, destinoNombre, mostrarItinerario } = useLocalSearchParams();
  const { location } = useLocation();
  const { savedItems } = useItinerary();

  const [comunaActiva, setComunaActiva] = useState(0);
  const [lugares, setLugares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el "Modo Ruta" peatonal
  const [destinoActivo, setDestinoActivo] = useState<{
    lat: number;
    lng: number;
    nombre: string;
  } | null>(null);
  const [rutaCaminando, setRutaCaminando] = useState<{ latitude: number; longitude: number }[]>([]);
  const [lineaItinerarioCoords, setLineaItinerarioCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  // 1. Inicializar Modo Ruta si venimos de un detalle
  useEffect(() => {
    if (destinoLat && destinoLng) {
      setDestinoActivo({
        lat: Number(destinoLat),
        lng: Number(destinoLng),
        nombre: destinoNombre as string,
      });
      setComunaActiva(0);
    } else {
      setDestinoActivo(null);
      setRutaCaminando([]);
    }
  }, [destinoLat, destinoLng, destinoNombre]);

  // 2. Calcular ruta peatonal OSRM
  useEffect(() => {
    const fetchRuta = async () => {
      if (location && destinoActivo) {
        try {
          const originLon = location.coords.longitude;
          const originLat = location.coords.latitude;
          const destLon = destinoActivo.lng;
          const destLat = destinoActivo.lat;

          const url = `https://router.project-osrm.org/route/v1/foot/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson`;

          const response = await fetch(url);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates;
            const formattedCoords = coords.map((c: [number, number]) => ({
              latitude: c[1],
              longitude: c[0],
            }));
            setRutaCaminando(formattedCoords);
          }
        } catch (error) {
          console.error("Error al obtener la ruta peatonal:", error);
        }
      }
    };

    fetchRuta();
  }, [location, destinoActivo]);

  // 3. Cargar todos los puntos de interés de Supabase
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

  // Determinar si mostramos el itinerario guardado
  const esItinerarioActivo = mostrarItinerario === "true";

  // Filtrado inteligente
  const lugaresMostrados = useMemo(() => {
    if (destinoActivo) {
      return lugares.filter((l) => l.nombre === destinoActivo.nombre);
    }
    if (esItinerarioActivo) {
      // Filtrar únicamente los puntos que están guardados en el itinerario
      return lugares.filter((l) => savedItems.includes(l.id));
    }
    if (comunaActiva === 0) {
      return lugares;
    }
    return lugares.filter((l) => l.comuna === comunaActiva);
  }, [lugares, destinoActivo, esItinerarioActivo, savedItems, comunaActiva]);

  // 4. Calcular ruta real a pie calle por calle para el itinerario conectado
  useEffect(() => {
    const fetchItineraryRoute = async () => {
      if (esItinerarioActivo && lugaresMostrados.length >= 2) {
        try {
          // Ordena los lugares por el orden en que se guardaron
          const ordenados = [...lugaresMostrados].sort(
            (a, b) => savedItems.indexOf(a.id) - savedItems.indexOf(b.id)
          );
          
          // Construye la lista de coordenadas para OSRM: lon1,lat1;lon2,lat2;lon3,lat3...
          const coordsString = ordenados.map((l) => `${l.lng},${l.lat}`).join(";");
          
          const url = `https://router.project-osrm.org/route/v1/foot/${coordsString}?overview=full&geometries=geojson`;
          
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates;
            const formattedCoords = coords.map((c: [number, number]) => ({
              latitude: c[1],
              longitude: c[0],
            }));
            setLineaItinerarioCoords(formattedCoords);
          }
        } catch (error) {
          console.error("Error al calcular ruta de itinerario real:", error);
          // Fallback: usar líneas rectas si la API falla
          const ordenados = [...lugaresMostrados].sort(
            (a, b) => savedItems.indexOf(a.id) - savedItems.indexOf(b.id)
          );
          setLineaItinerarioCoords(ordenados.map((l) => ({ latitude: l.lat, longitude: l.lng })));
        }
      } else {
        setLineaItinerarioCoords([]);
      }
    };

    fetchItineraryRoute();
  }, [esItinerarioActivo, lugaresMostrados, savedItems]);

  // Calcular región del mapa inicial
  const regionInicial = useMemo(() => {
    if (destinoActivo) {
      return {
        latitude: destinoActivo.lat,
        longitude: destinoActivo.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    if (esItinerarioActivo && lugaresMostrados.length > 0) {
      // Enfoca en el primer elemento del itinerario
      return {
        latitude: lugaresMostrados[0].lat,
        longitude: lugaresMostrados[0].lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    return {
      latitude: -34.6037,
      longitude: -58.3816,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    };
  }, [destinoActivo, esItinerarioActivo, lugaresMostrados]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Barra de cabecera "Chapa" */}
      <View style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.chapaTitle}>{t.titulo}</Text>
          <Text style={styles.chapaSub} numberOfLines={1}>
            {destinoActivo
              ? `🚶 ${t.rutaHacia} ${destinoActivo.nombre}`
              : esItinerarioActivo
              ? `⭐ ${t.itinerarioActivo} (${lugaresMostrados.length})`
              : `${lugaresMostrados.length} ${t.subtitulo}`}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Scroll Horizontal de Comunas (se oculta en Modo Itinerario o Modo Ruta) */}
        {!destinoActivo && !esItinerarioActivo && (
          <View style={styles.chipContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
            >
              {t.comunas.map((comunaLabel, index) => {
                const isSelected = comunaActiva === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.chip,
                      { borderColor: theme.colors.border },
                      isSelected && {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => setComunaActiva(index)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? "#fff" : theme.colors.textSecondary },
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

        {/* Contenedor del Mapa */}
        <View style={[styles.mapContainer, { borderColor: theme.colors.border }]}>
          {loading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ marginTop: 10, color: theme.colors.textSecondary }}>{t.cargando}</Text>
            </View>
          ) : (
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={regionInicial}
              showsUserLocation={true}
            >
              {/* Renderizado de marcadores */}
              {lugaresMostrados.map((lugar) => {
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

              {/* Dibujar ruta peatonal (Modo "Cómo llegar") */}
              {rutaCaminando.length > 0 && (
                <Polyline
                  coordinates={rutaCaminando}
                  strokeColor={theme.colors.primary}
                  strokeWidth={4}
                  lineDashPattern={[6, 6]}
                />
              )}

              {/* Dibujar ruta del itinerario conectando marcadores */}
              {lineaItinerarioCoords.length > 0 && (
                <Polyline
                  coordinates={lineaItinerarioCoords}
                  strokeColor={theme.colors.secondary}
                  strokeWidth={4.5}
                />
              )}
            </MapView>
          )}
        </View>

        {/* Leyenda del Mapa */}
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#1F4778" }]} />
            <Text style={styles.legendText}>{t.leyenda.edificio}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#3F6B4F" }]} />
            <Text style={styles.legendText}>{t.leyenda.parque}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#C9542A" }]} />
            <Text style={styles.legendText}>{t.leyenda.museo}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#7C5FA8" }]} />
            <Text style={styles.legendText}>{t.leyenda.teatro}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#E0A23A" }]} />
            <Text style={styles.legendText}>{t.leyenda.zona}</Text>
          </View>
        </View>
      </View>

      {/* Pie de navegación */}
      <BottomNavBar activeTab={1} />
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
});
