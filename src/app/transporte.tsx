import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLang } from "../context/LangContext";
import { supabase } from "../lib/supabase";
import { useAppTheme } from "../theme/colors";

const traducciones = {
  es: {
    titulo: "Transporte turístico",
    subtitulo: "Líneas y recorridos de la ciudad",
    tabs: { subte: "Subte", tren: "Trenes", bus: "Bus turístico" },
    verRecorrido: "Ver recorrido en mapa",
    cargando: "Cargando transportes...",
    sinDatos: "No hay líneas disponibles.",
    estaciones: "Estaciones / Paradas:",
    cantidadEstaciones: (n: number) => `${n} estaciones`,
    nav: ["Inicio", "Mapa", "Transporte", "Resto", "Recorrido"],
  },
  en: {
    titulo: "Tourist Transport",
    subtitulo: "City lines and routes",
    tabs: { subte: "Subway", tren: "Trains", bus: "Tourist Bus" },
    verRecorrido: "View route on map",
    cargando: "Loading transit...",
    sinDatos: "No lines available.",
    estaciones: "Stations / Stops:",
    cantidadEstaciones: (n: number) => `${n} stations`,
    nav: ["Home", "Map", "Transit", "Dining", "Itinerary"],
  },
};

// --- Tipos que reflejan la estructura real de la tabla "transporte" en Supabase ---
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
  ruta_es: string;
  ruta_en: string;
  paradas_es: string | null;
  paradas_en: string | null;
  coordenadas: CoordPoint[] | null;
  estaciones_json: EstacionJson[] | null;
}

export default function TransporteScreen() {
  const theme = useAppTheme();
  const { lang } = useLang();
  const t = traducciones[lang as keyof typeof traducciones];
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"subte" | "tren" | "bus">("subte");
  const [transportes, setTransportes] = useState<LineaTransporte[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransportes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("transporte")
          .select(
            "id, tipo, nombre, color, ruta_es, ruta_en, paradas_es, paradas_en, coordenadas, estaciones_json",
          );
        if (error) throw error;
        setTransportes((data as LineaTransporte[]) || []);
      } catch (error) {
        console.error("Error al cargar transportes:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTransportes();
  }, []);

  const lineasMostradas = transportes.filter((item) => item.tipo === activeTab);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}
      >
        <View>
          <Text style={styles.chapaTitle}>{t.titulo}</Text>
          <Text style={styles.chapaSub}>{t.subtitulo}</Text>
        </View>
      </View>

      <View style={styles.transportTabs}>
        {(["subte", "tren", "bus"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabBtn,
              activeTab === tab && {
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.primary,
              },
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === tab
                  ? { color: "#fff" }
                  : { color: theme.colors.textSecondary },
              ]}
            >
              {t.tabs[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>{t.cargando}</Text>
          </View>
        ) : lineasMostradas.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>{t.sinDatos}</Text>
          </View>
        ) : (
          lineasMostradas.map((item) => (
            <View
              key={item.id}
              style={[styles.circuitCard, { borderColor: theme.colors.border }]}
            >
              <View style={styles.topRow}>
                <View style={styles.titleWrapper}>
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text style={styles.circuitTitle}>{item.nombre}</Text>
                </View>
                {(item.estaciones_json?.length || item.coordenadas?.length) && (
                  <Text style={styles.stationCount}>
                    {t.cantidadEstaciones(
                      item.estaciones_json?.length ??
                        item.coordenadas?.length ??
                        0,
                    )}
                  </Text>
                )}
              </View>

              <Text style={styles.statText}>
                {lang === "es" ? item.ruta_es : item.ruta_en}
              </Text>

              {/* Recorrido completo: nombre de cada estación, en el orden real de la línea */}
              <Text style={styles.sectionLabel}>{t.estaciones}</Text>
              <Text style={styles.estacionesLista}>
                {item.estaciones_json && item.estaciones_json.length > 0
                  ? item.estaciones_json.map((e) => e.nombre).join(" • ")
                  : lang === "es"
                    ? item.paradas_es
                    : item.paradas_en}
              </Text>

              <TouchableOpacity
                style={styles.mapBtn}
                activeOpacity={0.8}
                onPress={() => {
                  router.push({
                    pathname: "/mapa",
                    params: {
                      transporteId: item.id,
                      transporteNombre: item.nombre,
                    },
                  });
                }}
              >
                <Ionicons name="map" size={16} color={theme.colors.primary} />
                <Text
                  style={[styles.mapBtnText, { color: theme.colors.primary }]}
                >
                  {t.verRecorrido}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={[styles.bottomNav, { borderColor: theme.colors.border }]}>
        {t.nav.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => {
              if (index === 0) router.push("/inicio");
              if (index === 1) router.push("/mapa");
            }}
          >
            <Ionicons
              name={
                index === 2
                  ? "bus"
                  : ([
                      "home-outline",
                      "map-outline",
                      "",
                      "restaurant-outline",
                      "list-outline",
                    ][index] as any)
              }
              size={22}
              color={
                index === 2 ? theme.colors.primary : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.navText,
                index === 2 && { color: theme.colors.primary },
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chapaBar: { paddingHorizontal: 18, paddingVertical: 14 },
  chapaTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  chapaSub: {
    fontSize: 11,
    color: "#C7D2E3",
    marginTop: 2,
    fontFamily: "monospace",
  },
  transportTabs: {
    flexDirection: "row",
    gap: 6,
    marginHorizontal: 18,
    marginVertical: 14,
  },
  tabBtn: {
    flex: 1,
    borderWidth: 1,
    backgroundColor: "#fff",
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: "center",
  },
  tabBtnText: { fontSize: 11.5, fontWeight: "bold" },
  scrollArea: { flex: 1, paddingHorizontal: 18 },
  circuitCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 8,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleWrapper: { flexDirection: "row", alignItems: "center", gap: 8 },
  circuitTitle: { fontSize: 14, fontWeight: "bold", color: "#1B2330" },
  stationCount: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8B8F7E",
    fontFamily: "monospace",
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statText: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "bold",
    color: "#1F4778",
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#8B8F7E",
    marginTop: 10,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  estacionesLista: { fontSize: 11.5, color: "#5B6270", lineHeight: 18 },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EFEADD",
  },
  mapBtnText: { fontSize: 12, fontWeight: "bold" },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  navItem: { flex: 1, alignItems: "center", gap: 3 },
  navText: { fontSize: 8.5, fontWeight: "bold", color: "#8B8F7E" },
  centerContainer: { padding: 40, alignItems: "center" },
  loadingText: { marginTop: 12, color: "#8B8F7E", fontSize: 12 },
});
