import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useItinerary } from "../context/ItineraryContext";
import { useLang } from "../context/LangContext";
import BottomNavBar from "../components/BottomNavBar";
import { supabase } from "../lib/supabase";
import { useAppTheme } from "../theme/colors";

const traducciones = {
  es: {
    resena: "Reseña especial",
    direccion: "Dirección",
    comoLlegar: "Cómo llegar",
    guardar: "Guardar",
    guardado: "Guardado",
    cargando: "Cargando información...",
    michelin: "Estrella Michelin",
    bodegon: "Bodegón Histórico",
    comuna: (c: number) => `Comuna ${c}`,
  },
  en: {
    resena: "Special review",
    direccion: "Address",
    comoLlegar: "Directions",
    guardar: "Save",
    guardado: "Saved",
    cargando: "Loading information...",
    michelin: "Michelin Star",
    bodegon: "Historic Tavern",
    comuna: (c: number) => `Commune ${c}`,
  },
};

const FOTOS_RESTAURANTES: Record<string, any> = {
  "ac1c8282-8efd-45dd-a5e1-c7a3bd58c5b0": require("../../assets/images/don-julio.png"),
  "09fec52d-54ed-472b-bcb2-3615a9d9996f": require("../../assets/images/el-obrero.png"),
};

interface Restaurante {
  id: string;
  nombre: string;
  reconocimiento: string;
  comuna: number;
  direccion: string;
  resena_especial_es: string;
  resena_especial_en: string;
  lat: number;
  lng: number;
}

export default function DetalleRestoScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useAppTheme();

  const { lang: globalLang } = useLang();
  const [localLang, setLocalLang] = useState(globalLang);
  const t = traducciones[localLang as keyof typeof traducciones] || traducciones.es;

  const { toggleItem, isSaved } = useItinerary();
  const saved = typeof id === "string" ? isSaved(id) : false;

  const [resto, setResto] = useState<Restaurante | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetalle = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("restaurantes")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setResto(data as Restaurante);
      } catch (error) {
        console.error("Error al cargar detalle del restaurante:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetalle();
  }, [id]);

  const openMaps = () => {
    if (resto?.lat && resto?.lng) {
      router.push({
        pathname: "/mapa",
        params: {
          destinoLat: resto.lat,
          destinoLng: resto.lng,
          destinoNombre: resto.nombre,
        },
      });
    }
  };

  if (loading || !resto) {
    return (
      <SafeAreaView style={[styles.container, styles.centerAll, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>
          {traducciones[globalLang as keyof typeof traducciones].cargando}
        </Text>
      </SafeAreaView>
    );
  }

  const foto = FOTOS_RESTAURANTES[resto.id];
  const isMichelin = resto.reconocimiento.toLowerCase().includes("michelin");
  const recColors = isMichelin
    ? { bg: "#FCE8E6", text: "#C9542A", border: "#F5B4AD" }
    : { bg: "#E6F4EA", text: "#3F6B4F", border: "#A3D8B6" };
  const recLabel = isMichelin ? t.michelin : t.bodegon;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Botón de volver atrás flotante */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.8}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={globalLang === "es" ? "Volver a la pantalla anterior" : "Go back"}
      >
        <Ionicons name="arrow-back" size={24} color="#1B2330" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Imagen del Hero */}
        <View style={styles.heroPhoto}>
          {foto ? (
            <Image source={foto} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.centerAll, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="restaurant" size={64} color="#fff" />
            </View>
          )}
        </View>

        {/* Información del Restaurante */}
        <View style={styles.poiTitleRow}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: recColors.bg, borderColor: recColors.border }]}>
              <Text style={[styles.badgeText, { color: recColors.text }]}>{recLabel}</Text>
            </View>
            <Text style={styles.communeText}>{t.comuna(resto.comuna)}</Text>
          </View>
          
          <Text style={styles.titleText}>{resto.nombre}</Text>
          
          <Text style={styles.locText}>
            <Ionicons name="location-sharp" size={12} color={theme.colors.textSecondary} />
            {" "}{resto.direccion}
          </Text>
        </View>

        {/* Previsualización del mapa (Minimapa de usabilidad) */}
        <View style={styles.miniMapContainer}>
          <MapView
            style={styles.miniMap}
            region={{
              latitude: resto.lat,
              longitude: resto.lng,
              latitudeDelta: 0.0012,
              longitudeDelta: 0.0012,
            }}
            minZoomLevel={16.5}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker
              coordinate={{ latitude: resto.lat, longitude: resto.lng }}
              title={resto.nombre}
            />
          </MapView>
        </View>

        {/* Reseña Especial */}
        <View style={styles.descCard}>
          <View style={styles.descHeadRow}>
            <Text style={styles.descLabel}>{t.resena}</Text>
            <View style={styles.togglePill}>
              <TouchableOpacity
                style={[styles.toggleBtn, localLang === "es" && { backgroundColor: theme.colors.primary }]}
                onPress={() => setLocalLang("es")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={globalLang === 'es' ? 'Mostrar reseña en Español' : 'Show description in Spanish'}
              >
                <Text style={[styles.toggleBtnText, localLang === "es" ? { color: "#fff" } : { color: theme.colors.textSecondary }]}>
                  ES
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, localLang === "en" && { backgroundColor: theme.colors.primary }]}
                onPress={() => setLocalLang("en")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={globalLang === 'es' ? 'Mostrar reseña en Inglés' : 'Show description in English'}
              >
                <Text style={[styles.toggleBtnText, localLang === "en" ? { color: "#fff" } : { color: theme.colors.textSecondary }]}>
                  EN
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.descBody}>
            {localLang === "es" ? resto.resena_especial_es : resto.resena_especial_en}
          </Text>
        </View>

        {/* Botones de acción */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.secondary }]}
            activeOpacity={0.8}
            onPress={openMaps}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${t.comoLlegar} a ${resto.nombre}`}
          >
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>
              {t.comoLlegar}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: saved ? theme.colors.primary : "#fff",
                borderWidth: 1,
                borderColor: saved ? theme.colors.primary : theme.colors.border,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => toggleItem(resto.id)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={saved ? (globalLang === "es" ? "Quitar de Mi Recorrido" : "Remove from itinerary") : (globalLang === "es" ? "Guardar en Mi Recorrido" : "Save to itinerary")}
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={16}
              color={saved ? "#fff" : theme.colors.text}
            />
            <Text style={[styles.actionBtnText, { color: saved ? "#fff" : theme.colors.text }]}>
              {saved ? t.guardado : t.guardar}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      <BottomNavBar activeTab={3} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerAll: {
    justifyContent: "center",
    alignItems: "center",
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroPhoto: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  poiTitleRow: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    fontFamily: "monospace",
  },
  communeText: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#8B8F7E",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  titleText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1B2330",
    marginVertical: 6,
  },
  locText: {
    fontSize: 12,
    color: "#5A5E50",
  },
  descCard: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D9D2BC",
    borderRadius: 12,
    padding: 14,
  },
  descHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  descLabel: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "bold",
    color: "#5A5E50",
    textTransform: "uppercase",
  },
  miniMapContainer: {
    marginHorizontal: 18,
    marginTop: 12,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D9D2BC",
  },
  miniMap: {
    width: "100%",
    height: "100%",
  },
  togglePill: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D9D2BC",
    borderRadius: 9,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  descBody: {
    fontSize: 13.5,
    lineHeight: 20,
    color: "#1B2330",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 18,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
