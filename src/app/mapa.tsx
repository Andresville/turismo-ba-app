import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, Callout, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AppLogo from "../components/AppLogo";
import BottomNavBar from "../components/BottomNavBar";
import { useItinerary } from "../context/ItineraryContext";
import { useLocation } from "../context/LocationContext";
import { supabase } from "../lib/supabase";
import { getCategoryColor, getCategoryIcon, getCategoryLabel, useAppTheme } from "../theme/colors";
import { useTranslation } from "../locales/i18n";
import { Lugar } from "../types/database";
import { offlineCache, OFFLINE_KEYS } from "../lib/offline-cache";
import { OfflineBanner, ErrorState } from "../components/connection-status";
import { ordenarPorCercania } from "../utils/geo";
import { fetchWalkingRoute } from "../utils/routing";

export default function MapaScreen() {
  const theme = useAppTheme();
  const { t, lang } = useTranslation();
  const router = useRouter();

  const { destinoLat, destinoLng, destinoNombre, mostrarItinerario } = useLocalSearchParams();
  const { location } = useLocation();
  const { savedItems } = useItinerary();

  const handleNavigateToDetail = (lugar: any) => {
    if (!lugar || !lugar.id) return;
    router.push({
      pathname: lugar.categoria === "Restaurantes" ? "/detalle-resto" as any : "/detalle" as any,
      params: { id: lugar.id },
    });
  };

  const [comunaActiva, setComunaActiva] = useState(0);
  const [lugares, setLugares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);

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

  // 2. Calcular ruta peatonal (OpenRouteService)
  useEffect(() => {
    const fetchRuta = async () => {
      if (location && destinoActivo) {
        const coords = await fetchWalkingRoute([
          { lat: location.coords.latitude, lng: location.coords.longitude },
          { lat: destinoActivo.lat, lng: destinoActivo.lng },
        ]);
        if (coords) {
          setRutaCaminando(coords);
        } else {
          // Fallback: línea recta si falla la API de ruteo
          setRutaCaminando([
            { latitude: location.coords.latitude, longitude: location.coords.longitude },
            { latitude: destinoActivo.lat, longitude: destinoActivo.lng },
          ]);
        }
      }
    };

    fetchRuta();
  }, [location, destinoActivo]);

  const fetchMapa = async () => {
    setLoading(true);
    setErrorLoading(false);
    try {
      const [puntosRes, restosRes] = await Promise.all([
        offlineCache.get<Lugar[]>(
          OFFLINE_KEYS.PUNTOS_INTERES,
          async () => {
            const { data, error } = await supabase
              .from("puntos_interes")
              .select("*");
            if (error) throw error;
            return data || [];
          }
        ),
        offlineCache.get<any[]>(
          OFFLINE_KEYS.RESTAURANTES,
          async () => {
            const { data, error } = await supabase
              .from("restaurantes")
              .select("*");
            if (error) throw error;
            return data || [];
          }
        )
      ]);

      const puntos = puntosRes.data || [];
      const restos = (restosRes.data || []).map((r) => ({
        ...r,
        categoria: "Restaurantes",
      }));

      setLugares([...puntos, ...restos]);
      setIsOffline(puntosRes.isOffline || restosRes.isOffline);
    } catch (error) {
      console.error("Error al cargar mapa:", error);
      setErrorLoading(true);
    } finally {
      setLoading(false);
    }
  };

  // 3. Cargar todos los puntos de interés y restaurantes de Supabase
  useEffect(() => {
    fetchMapa();
  }, []);

  // Determinar si mostramos el itinerario guardado
  const esItinerarioActivo = mostrarItinerario === "true";

  // Filtrado inteligente
  const lugaresMostrados = useMemo(() => {
    if (destinoActivo) {
      // El destino puntual se dibuja aparte (ver Marker dedicado más abajo):
      // buscarlo por nombre en "lugares" era frágil (podía matchear el lugar
      // equivocado, o ninguno si venía de un alojamiento, que ni siquiera se
      // carga en esta pantalla).
      return [];
    }
    if (esItinerarioActivo) {
      // Filtrar únicamente los puntos que están guardados en el itinerario
      return lugares.filter((l) => savedItems.includes(l.id));
    }
    if (comunaActiva === 0) {
      return lugares.filter((l) => l.categoria !== "Restaurantes");
    }
    return lugares.filter((l) => l.comuna === comunaActiva && l.categoria !== "Restaurantes");
  }, [lugares, destinoActivo, esItinerarioActivo, savedItems, comunaActiva]);

  // 4. Calcular ruta real a pie calle por calle para el itinerario conectado
  useEffect(() => {
    const fetchItineraryRoute = async () => {
      if (esItinerarioActivo && lugaresMostrados.length >= 2) {
        // 1. Obtener punto inicial (ubicación del usuario o Obelisco si no está disponible)
        const startLat = location ? location.coords.latitude : -34.6037;
        const startLng = location ? location.coords.longitude : -58.3816;

        // 2. Ordenar por cercanía secuencial (vecino más cercano)
        const ordenados = ordenarPorCercania(lugaresMostrados, startLat, startLng);

        // 3. Pedir la ruta a pie real que conecta todos los puntos en ese orden
        const coords = await fetchWalkingRoute(
          ordenados.map((l) => ({ lat: l.lat, lng: l.lng }))
        );

        if (coords) {
          setLineaItinerarioCoords(coords);
        } else {
          // Fallback: usar líneas rectas si la API falla
          setLineaItinerarioCoords(ordenados.map((l) => ({ latitude: l.lat, longitude: l.lng })));
        }
      } else {
        setLineaItinerarioCoords([]);
      }
    };

    fetchItineraryRoute();
  }, [esItinerarioActivo, lugaresMostrados, savedItems, location]);

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
      <OfflineBanner isOffline={isOffline} />
      {/* Barra de cabecera "Chapa" */}
      <View style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <AppLogo />
          <View style={{ flex: 1 }}>
            <Text style={styles.chapaTitle}>{t("mapa.titulo")}</Text>
            <Text style={styles.chapaSub} numberOfLines={1}>
              {destinoActivo
                ? `🚶 ${t("mapa.rutaHacia")} ${destinoActivo.nombre}`
                : esItinerarioActivo
                  ? `⭐ ${t("mapa.itinerarioActivo")} (${lugaresMostrados.length})`
                  : `${lugaresMostrados.length} ${t("mapa.subtitulo")}`}
            </Text>
          </View>
        </View>
      </View>

      {errorLoading ? (
        <ErrorState onRetry={fetchMapa} />
      ) : (
        <View style={styles.content}>
          {/* Scroll Horizontal de Comunas (se oculta en Modo Itinerario o Modo Ruta) */}
          {!destinoActivo && !esItinerarioActivo && (
            <View style={styles.chipContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScroll}
              >
                {(t("mapa.comunas") as string[]).map((comunaLabel, index) => {
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
                <Text style={{ marginTop: 10, color: theme.colors.textSecondary }}>{t("mapa.cargando")}</Text>
              </View>
            ) : (
            <MapView
              style={styles.map}
              provider={Platform.OS === 'ios' ? PROVIDER_GOOGLE : undefined}
              initialRegion={regionInicial}
              showsUserLocation={!!location}
            >
              {/* Marcador del destino puntual (Modo "Cómo llegar"), armado directo
                  a partir de los parámetros de navegación, sin depender de que el
                  lugar exista en las listas cargadas acá (los alojamientos, por
                  ejemplo, no se cargan en esta pantalla) */}
              {destinoActivo && (
                <Marker
                  coordinate={{
                    latitude: destinoActivo.lat,
                    longitude: destinoActivo.lng,
                  }}
                  title={destinoActivo.nombre}
                  pinColor={theme.colors.secondary}
                />
              )}

              {/* Renderizado de marcadores */}
              {lugaresMostrados.map((lugar) => {
                if (!lugar.lat || !lugar.lng) return null;
                return (
                  <Marker
                    key={lugar.id}
                    coordinate={{
                      latitude: Number(lugar.lat),
                      longitude: Number(lugar.lng),
                    }}
                    title={lugar.nombre}
                    description={lang === "es" ? "Ver detalle →" : lang === "pt" ? "Ver detalhes →" : "View details →"}
                    onCalloutPress={() => handleNavigateToDetail(lugar)}
                    pinColor={getCategoryColor(lugar.categoria)}
                  />
                );
              })}

              {/* Dibujar ruta peatonal (Modo "Cómo llegar") */}
              {rutaCaminando.length > 0 && (
                <Polyline
                  coordinates={rutaCaminando}
                  strokeColor={theme.colors.secondary}
                  strokeWidth={4.5}
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

        {/* Leyenda del Mapa Dinámica */}
        <View style={styles.mapLegend}>
          {[
            "Edificios historicos",
            "Parques",
            "Museos",
            "Teatros",
            "Canchas de futbol",
            "Zonas turisticas",
            "Cupulas",
          ].map((cat) => (
            <View key={cat} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getCategoryColor(cat) }]} />
              <Text style={styles.legendText}>{getCategoryLabel(cat, lang)}</Text>
            </View>
          ))}
        </View>
        </View>
      )}

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
  customMarkerCircle: {
    width: 25,
    height: 25,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.5,
    elevation: 3,
  },
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
  markerHitTarget: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  calloutTooltip: {
    width: 170,
    minHeight: 56,
    backgroundColor: "#FBF9F2", // marfil-card
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D9D2BC", // linea-borde
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  calloutNativeContainer: {
    minWidth: 160,
    maxWidth: 220,
    padding: 4,
  },
  calloutNativeContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1B2330",
    textAlign: "center",
    marginBottom: 4,
  },
  calloutLink: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#C9542A",
    textAlign: "center",
  },
});
