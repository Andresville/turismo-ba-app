import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
  const t = traducciones[lang];
  const router = useRouter();

  // Recibimos parámetros de la pantalla de detalle y el GPS
  const { destinoLat, destinoLng, destinoNombre } = useLocalSearchParams();
  const { location } = useLocation();

  const [comunaActiva, setComunaActiva] = useState(0);
  const [lugares, setLugares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Lógica de Filtrado Inteligente:
  // Si hay ruta activa, mostramos SOLO ese lugar. Si no, filtramos por comuna.
  const lugaresMostrados = destinoActivo
    ? lugares.filter((lugar) => lugar.nombre === destinoActivo.nombre)
    : comunaActiva === 0
      ? lugares
      : lugares.filter((lugar) => lugar.comuna === comunaActiva);

  const regionInicial = {
    latitude: destinoActivo ? destinoActivo.lat : -34.6037,
    longitude: destinoActivo ? destinoActivo.lng : -58.3816,
    latitudeDelta: destinoActivo ? 0.02 : 0.12, // Más zoom si hay destino
    longitudeDelta: destinoActivo ? 0.02 : 0.12,
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
              : `${lugaresMostrados.length} ${t.subtitulo}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="filter-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Scroll Horizontal de Comunas */}
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

        <View
          style={[styles.mapContainer, { borderColor: theme.colors.border }]}
        >
          {loading ? (
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

              {/* Dibujamos la ruta peatonal calle por calle si existe */}
              {rutaCaminando.length > 0 && (
                <Polyline
                  coordinates={rutaCaminando}
                  strokeColor={theme.colors.primary}
                  strokeWidth={4}
                  lineDashPattern={[6, 6]} // Línea punteada
                />
              )}
            </MapView>
          )}
        </View>

        {/* Ocultamos la leyenda de colores si estamos en Modo Ruta para ganar espacio visual */}
        {!destinoActivo && (
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
