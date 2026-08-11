import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ProgressBar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AppLogo from "../components/AppLogo";
import BottomNavBar from "../components/BottomNavBar";
import { useItinerary } from "../context/ItineraryContext";
import { useLocation } from "../context/LocationContext";
import { supabase } from "../lib/supabase";
import { useAppTheme, getCategoryLabel } from "../theme/colors";
import { useTranslation } from "../locales/i18n";
import { Lugar } from "../types/database";
import { offlineCache, OFFLINE_KEYS } from "../lib/offline-cache";
import { OfflineBanner, ErrorState } from "../components/connection-status";
import { ordenarPorCercania } from "../utils/geo";

// Obelisco: punto de partida por defecto cuando todavía no hay GPS del usuario.
const OBELISCO_LAT = -34.6037;
const OBELISCO_LNG = -58.3816;

export default function RecorridoScreen() {
  const theme = useAppTheme();
  const { t, lang } = useTranslation();
  const router = useRouter();

  const { savedItems, dayMap, toggleItem } = useItinerary();
  const { location } = useLocation();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [visitedItems, setVisitedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);

  const fetchLugares = async () => {
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

      setLugares([...puntos, ...restos] as Lugar[]);
      setIsOffline(puntosRes.isOffline || restosRes.isOffline);
    } catch (error) {
      console.error("Error al cargar puntos de interés y restaurantes para itinerario:", error);
      setErrorLoading(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLugares();
  }, []);

  // 2. Cargar visitados de AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem("@visited_items").then((data) => {
      if (data) setVisitedItems(JSON.parse(data));
    });
  }, []);

  // 3. Filtrar los lugares guardados del usuario
  const lugaresGuardados = useMemo(() => {
    return lugares.filter((l) => savedItems.includes(l.id));
  }, [lugares, savedItems]);

  // 4. Agrupar los lugares guardados: los que vienen de un itinerario IA
  // guardado de una vez se muestran separados por día (dayMap), el resto
  // (guardados a mano con el corazón) van en una sección aparte. Dentro de
  // cada grupo se ordenan por cercanía a pie (vecino más cercano),
  // arrancando desde la ubicación del usuario si está disponible, para que
  // el recorrido no zigzaguee entre puntos lejanos y cercanos.
  const { gruposPorDia, sueltos } = useMemo(() => {
    const startLat = location ? location.coords.latitude : OBELISCO_LAT;
    const startLng = location ? location.coords.longitude : OBELISCO_LNG;

    const conDia = lugaresGuardados.filter((l) => dayMap[l.id] != null);
    const sinDia = lugaresGuardados.filter((l) => dayMap[l.id] == null);

    const porDia = new Map<number, Lugar[]>();
    conDia.forEach((l) => {
      const dia = dayMap[l.id];
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia)!.push(l);
    });

    const gruposPorDia = Array.from(porDia.entries())
      .sort(([a], [b]) => a - b)
      .map(([dia, items]) => ({
        dia,
        lugares: ordenarPorCercania(items, startLat, startLng),
      }));

    return { gruposPorDia, sueltos: ordenarPorCercania(sinDia, startLat, startLng) };
  }, [lugaresGuardados, dayMap, location]);

  const toggleVisited = async (id: string) => {
    let newList = [...visitedItems];
    if (newList.includes(id)) {
      newList = newList.filter((item) => item !== id);
    } else {
      newList.push(id);
    }
    setVisitedItems(newList);
    await AsyncStorage.setItem("@visited_items", JSON.stringify(newList));
  };

  const isVisited = (id: string) => visitedItems.includes(id);

  // 5. Calcular porcentaje de progreso
  const progressPercent = useMemo(() => {
    if (lugaresGuardados.length === 0) return 0;
    const visitadosGuardados = lugaresGuardados.filter((l) => isVisited(l.id)).length;
    return visitadosGuardados / lugaresGuardados.length;
  }, [lugaresGuardados, visitedItems]);

  const handleVerMapa = () => {
    router.push({
      pathname: "/mapa",
      params: { mostrarItinerario: "true" },
    });
  };

  const renderLugar = (lugar: Lugar, index: number) => {
    const visited = isVisited(lugar.id);
    return (
      <View
        key={lugar.id}
        style={[
          styles.placeRow,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {/* Checkbox circular: muestra el orden de la parada, y el visto al marcarla */}
        <TouchableOpacity
          style={[
            styles.checkbox,
            { borderColor: theme.colors.primary },
            visited && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => toggleVisited(lugar.id)}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: visited }}
          accessibilityLabel={lang === 'es'
            ? `Parada ${index + 1}. Marcar ${lugar.nombre} como visitado`
            : lang === 'pt'
            ? `Parada ${index + 1}. Marcar ${lugar.nombre} como visitado`
            : `Stop ${index + 1}. Mark ${lugar.nombre} as visited`}
        >
          {visited ? (
            <Ionicons name="checkmark" size={14} color="#fff" />
          ) : (
            <Text style={[styles.checkboxOrderText, { color: theme.colors.primary }]}>
              {index + 1}
            </Text>
          )}
        </TouchableOpacity>

        {/* Información del lugar */}
        <TouchableOpacity
          style={styles.placeInfo}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: lugar.categoria === "Restaurantes" ? "/detalle-resto" as any : "/detalle" as any, params: { id: lugar.id } })}
          accessible={true}
          accessibilityRole="link"
          accessibilityLabel={`${lugar.nombre}, ${getCategoryLabel(lugar.categoria, lang)}. ${lang === 'es' ? 'Toca para ver detalles' : lang === 'pt' ? 'Toque para ver detalhes' : 'Double tap to view details'}`}
        >
          <Text style={[styles.placeName, visited && styles.textLineThrough]} numberOfLines={1}>
            {lugar.nombre}
          </Text>
          <Text style={styles.placeCat} numberOfLines={1}>
            {getCategoryLabel(lugar.categoria, lang).toUpperCase()} · {t("recorrido.comuna", { c: lugar.comuna })}
          </Text>
        </TouchableOpacity>

        {/* Sello de pasaporte digital si está visitado */}
        {visited && (
          <View style={[styles.passportStamp, { borderColor: theme.colors.secondary }]}>
            <Text style={[styles.stampTextMain, { color: theme.colors.secondary }]}>
              {t("recorrido.visitado")}
            </Text>
            <Text style={[styles.stampTextSub, { color: theme.colors.secondary }]}>
              {t("recorrido.selloFecha")}
            </Text>
          </View>
        )}

        {/* Botón de eliminar del itinerario */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => toggleItem(lugar.id)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={lang === 'es'
            ? `Eliminar ${lugar.nombre} del recorrido`
            : lang === 'pt'
            ? `Remover ${lugar.nombre} do roteiro`
            : `Remove ${lugar.nombre} from itinerary`}
        >
          <Ionicons name="trash-outline" size={17} color="#A83232" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OfflineBanner isOffline={isOffline} />
      {/* Cabecera superior "Chapa" */}
      <View style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AppLogo />
          <View>
            <Text style={styles.chapaTitle}>{t("recorrido.titulo")}</Text>
            <Text style={styles.chapaSub}>{t("recorrido.subtitulo")}</Text>
          </View>
        </View>
      </View>

      {errorLoading ? (
        <ErrorState onRetry={fetchLugares} />
      ) : loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t("recorrido.cargando")}</Text>
        </View>
      ) : lugaresGuardados.length === 0 ? (
        // Estado vacío: Sin lugares guardados
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: "#FFF9EE", borderColor: "#D9D2BC" }]}>
            <Ionicons name="compass-outline" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t("recorrido.vacioTitulo")}</Text>
          <Text style={[styles.emptyDesc, { color: "#5A5E50" }]}>{t("recorrido.vacioDesc")}</Text>
          <TouchableOpacity
            style={[styles.btnExplorar, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/inicio")}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t("recorrido.btnExplorar")}
          >
            <Text style={styles.btnExplorarText}>{t("recorrido.btnExplorar")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Contenido del Itinerario
        <View style={styles.content}>
          {/* Panel de Progreso */}
          <View style={[styles.progressCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{t("recorrido.progreso")}</Text>
              <Text style={[styles.progressVal, { color: theme.colors.primary }]}>
                {Math.round(progressPercent * 100)}%
              </Text>
            </View>
            <ProgressBar
              progress={progressPercent}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            
            <TouchableOpacity
              style={[styles.btnMapa, { backgroundColor: theme.colors.secondary }]}
              onPress={handleVerMapa}
              activeOpacity={0.8}
            >
              <Ionicons name="map" size={16} color="#fff" />
              <Text style={styles.btnMapaText}>{t("recorrido.verMapa")}</Text>
            </TouchableOpacity>
          </View>

          {/* Listado de lugares, separado por día si vienen de un itinerario IA */}
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {gruposPorDia.length > 0 ? (
              <>
                {gruposPorDia.map((grupo) => (
                  <View key={grupo.dia}>
                    <Text style={[styles.dayGroupLabel, { color: theme.colors.secondary }]}>
                      {t("recorrido.diaLabel", { d: grupo.dia })}
                    </Text>
                    {grupo.lugares.map((lugar, index) => renderLugar(lugar, index))}
                  </View>
                ))}
                {sueltos.length > 0 && (
                  <View>
                    <Text style={[styles.dayGroupLabel, { color: theme.colors.textSecondary }]}>
                      {t("recorrido.otrosLugares")}
                    </Text>
                    {sueltos.map((lugar, index) => renderLugar(lugar, index))}
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={[styles.comunaLabel, { color: theme.colors.textSecondary }]}>
                  {t("recorrido.ordenSugerido")}
                </Text>
                {sueltos.map((lugar, index) => renderLugar(lugar, index))}
              </>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      )}

      {/* Pie de navegación */}
      <BottomNavBar activeTab={4} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chapaBar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  chapaTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  chapaSub: {
    fontSize: 11,
    color: "#C7D2E3",
    marginTop: 2,
    fontFamily: "monospace",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B2330",
    marginBottom: 10,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  btnExplorar: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnExplorarText: {
    color: "#fff",
    fontSize: 13.5,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
  },
  progressCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "monospace",
    textTransform: "uppercase",
  },
  progressVal: {
    fontSize: 14,
    fontWeight: "bold",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  btnMapa: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnMapaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  scrollArea: {
    flex: 1,
  },
  comunaLabel: {
    fontSize: 10.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    fontFamily: "monospace",
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  dayGroupLabel: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    fontFamily: "monospace",
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
    position: "relative",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxOrderText: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 13.5,
    fontWeight: "bold",
    color: "#1B2330",
  },
  textLineThrough: {
    textDecorationLine: "line-through",
    color: "#6B6F60",
  },
  placeCat: {
    fontSize: 10,
    color: "#5A5E50",
    fontFamily: "monospace",
    marginTop: 1,
  },
  passportStamp: {
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    transform: [{ rotate: "-12deg" }],
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
  },
  stampTextMain: {
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  stampTextSub: {
    fontSize: 6,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  deleteBtn: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
});
