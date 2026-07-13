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

import BottomNavBar from "../components/BottomNavBar";
import { useItinerary } from "../context/ItineraryContext";
import { useLang } from "../context/LangContext";
import { supabase } from "../lib/supabase";
import { useAppTheme } from "../theme/colors";

const traducciones = {
  es: {
    titulo: "Mi Recorrido",
    subtitulo: "Tu pasaporte de viaje por Buenos Aires",
    vacíoTitulo: "Tu pasaporte está vacío",
    vacíoDesc: "Explorá los puntos de interés de la ciudad y guardalos con el corazón ❤️ para armar tu circuito personalizado.",
    btnExplorar: "Buscar lugares",
    progreso: "Progreso del recorrido",
    verMapa: "Ver circuito en el mapa",
    visitado: "VISITADO",
    selloFecha: "BA EXPRESS",
    comuna: (c: number) => `Comuna ${c}`,
    cargando: "Cargando itinerario...",
  },
  en: {
    titulo: "My Itinerary",
    subtitulo: "Your travel passport through Buenos Aires",
    vacíoTitulo: "Your passport is empty",
    vacíoDesc: "Explore the city's points of interest and save them with a heart ❤️ to build your custom tour.",
    btnExplorar: "Search places",
    progreso: "Itinerary Progress",
    verMapa: "View circuit on map",
    visitado: "VISITED",
    selloFecha: "BA EXPRESS",
    comuna: (c: number) => `Commune ${c}`,
    cargando: "Loading itinerary...",
  },
};

interface Lugar {
  id: string;
  nombre: string;
  categoria: string;
  comuna: number;
  lat: number;
  lng: number;
}

export default function RecorridoScreen() {
  const theme = useAppTheme();
  const { lang } = useLang();
  const t = traducciones[lang as keyof typeof traducciones] || traducciones.es;
  const router = useRouter();

  const { savedItems } = useItinerary();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [visitedItems, setVisitedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Cargar lugares de Supabase
  useEffect(() => {
    const fetchLugares = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("puntos_interes")
          .select("id, nombre, categoria, comuna, lat, lng");
        if (error) throw error;
        setLugares((data as Lugar[]) || []);
      } catch (error) {
        console.error("Error al cargar puntos de interés para itinerario:", error);
      } finally {
        setLoading(false);
      }
    };
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

  // 4. Agrupar lugares guardados por comuna
  const lugaresPorComuna = useMemo(() => {
    const grupos: Record<number, Lugar[]> = {};
    lugaresGuardados.forEach((l) => {
      if (!grupos[l.comuna]) grupos[l.comuna] = [];
      grupos[l.comuna].push(l);
    });
    return grupos;
  }, [lugaresGuardados]);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cabecera superior "Chapa" */}
      <View style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}>
        <View>
          <Text style={styles.chapaTitle}>{t.titulo}</Text>
          <Text style={styles.chapaSub}>{t.subtitulo}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t.cargando}</Text>
        </View>
      ) : lugaresGuardados.length === 0 ? (
        // Estado vacío: Sin lugares guardados
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: "#FFF9EE", borderColor: "#D9D2BC" }]}>
            <Ionicons name="compass-outline" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t.vacíoTitulo}</Text>
          <Text style={[styles.emptyDesc, { color: "#5A5E50" }]}>{t.vacíoDesc}</Text>
          <TouchableOpacity
            style={[styles.btnExplorar, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/inicio")}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t.btnExplorar}
          >
            <Text style={styles.btnExplorarText}>{t.btnExplorar}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Contenido del Itinerario
        <View style={styles.content}>
          {/* Panel de Progreso */}
          <View style={[styles.progressCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{t.progreso}</Text>
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
              <Text style={styles.btnMapaText}>{t.verMapa}</Text>
            </TouchableOpacity>
          </View>

          {/* Listado de lugares agrupados por Comuna */}
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {Object.keys(lugaresPorComuna)
              .map(Number)
              .sort((a, b) => a - b)
              .map((comunaNum) => (
                <View key={comunaNum} style={styles.comunaGroup}>
                  {/* Etiqueta de Comuna */}
                  <Text style={[styles.comunaLabel, { color: theme.colors.textSecondary }]}>
                    {t.comuna(comunaNum)}
                  </Text>

                  {/* Lista de lugares de la comuna */}
                  {lugaresPorComuna[comunaNum].map((lugar) => {
                    const visited = isVisited(lugar.id);
                    return (
                      <View
                        key={lugar.id}
                        style={[
                          styles.placeRow,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                        ]}
                      >
                        {/* Checkbox circular para marcar como visitado */}
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
                            ? `Marcar ${lugar.nombre} como visitado` 
                            : `Mark ${lugar.nombre} as visited`}
                        >
                          {visited && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </TouchableOpacity>

                        {/* Información del lugar */}
                        <TouchableOpacity
                          style={styles.placeInfo}
                          activeOpacity={0.8}
                          onPress={() => router.push({ pathname: "/detalle", params: { id: lugar.id } })}
                          accessible={true}
                          accessibilityRole="link"
                          accessibilityLabel={`${lugar.nombre}, ${lugar.categoria}. ${lang === 'es' ? 'Toca para ver detalles' : 'Double tap to view details'}`}
                        >
                          <Text style={[styles.placeName, visited && styles.textLineThrough]} numberOfLines={1}>
                            {lugar.nombre}
                          </Text>
                          <Text style={styles.placeCat} numberOfLines={1}>
                            {lugar.categoria.toUpperCase()}
                          </Text>
                        </TouchableOpacity>

                        {/* Sello de pasaporte digital si está visitado */}
                        {visited && (
                          <View style={[styles.passportStamp, { borderColor: theme.colors.secondary }]}>
                            <Text style={[styles.stampTextMain, { color: theme.colors.secondary }]}>
                              {t.visitado}
                            </Text>
                            <Text style={[styles.stampTextSub, { color: theme.colors.secondary }]}>
                              {t.selloFecha}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
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
  comunaGroup: {
    marginTop: 12,
  },
  comunaLabel: {
    fontSize: 10.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    fontFamily: "monospace",
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
});
