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
import MapView, { Marker } from "react-native-maps";
import { Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

import BottomNavBar from "../components/BottomNavBar";
import { useItinerary } from "../context/ItineraryContext";
import { supabase } from "../lib/supabase";
import { useAppTheme } from "../theme/colors";
import { useTranslation } from "../locales/i18n";
import { Restaurante } from "../types/database";
import { offlineCache, OFFLINE_KEYS } from "../lib/offline-cache";

const FOTOS_RESTAURANTES: Record<string, any> = {
  "ac1c8282-8efd-45dd-a5e1-c7a3bd58c5b0": require("../../assets/images/don-julio.png"),
  "09fec52d-54ed-472b-bcb2-3615a9d9996f": require("../../assets/images/el-obrero.png"),
};

export default function DetalleRestoScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useAppTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();

  const { toggleItem, isSaved } = useItinerary();
  const saved = typeof id === "string" ? isSaved(id) : false;

  const [resto, setResto] = useState<Restaurante | null>(null);
  const [loading, setLoading] = useState(true);
  const [localLang, setLocalLang] = useState(lang);

  useEffect(() => {
    setLocalLang(lang);
  }, [lang]);

  useEffect(() => {
    const fetchDetalle = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: allRestos } = await offlineCache.get<Restaurante[]>(
          OFFLINE_KEYS.RESTAURANTES,
          async () => {
            const { data: dbData, error } = await supabase
              .from("restaurantes")
              .select("*");
            if (error) throw error;
            return dbData || [];
          }
        );

        const restoData = allRestos.find((r) => r.id === id);
        if (restoData) {
          setResto(restoData);
        }
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
          {t("detalleResto.cargando")}
        </Text>
      </SafeAreaView>
    );
  }

  const foto = resto.foto_url ? { uri: resto.foto_url } : FOTOS_RESTAURANTES[resto.id];
  const isMichelin = resto.reconocimiento.toLowerCase().includes("michelin");
  const recColors = isMichelin
    ? { bg: "#FCE8E6", text: "#C9542A", border: "#F5B4AD" }
    : { bg: "#E6F4EA", text: "#3F6B4F", border: "#A3D8B6" };
  const recLabel = isMichelin ? t("restaurantes.michelin") : t("restaurantes.bodegon");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Botón de volver atrás flotante */}
      <TouchableOpacity
        style={[styles.backBtn, { top: Math.max(insets.top, 16) + 8 }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={lang === "es" ? "Volver a la pantalla anterior" : "Go back"}
      >
        <Ionicons name="arrow-back" size={24} color="#1B2330" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Imagen del Hero */}
        <View style={styles.heroPhoto}>
          {foto ? (
            <Image source={foto} style={styles.heroImage} contentFit="cover" transition={200} />
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
            <Text style={styles.communeText}>{t("restaurantes.comuna", { c: resto.comuna })}</Text>
          </View>

          <Text style={styles.titleText}>{resto.nombre}</Text>

          <Text style={styles.locText}>
            <Ionicons name="location-sharp" size={12} color={theme.colors.textSecondary} />
            {" "}{resto.direccion}
          </Text>
        </View>

        {/* Previsualización del mapa (Minimapa de usabilidad) */}
        {resto?.lat && resto?.lng ? (
          <View style={styles.miniMapContainer}>
            <MapView
              style={styles.miniMap}
              region={{
                latitude: Number(resto.lat),
                longitude: Number(resto.lng),
                latitudeDelta: 0.004,
                longitudeDelta: 0.004,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: Number(resto.lat),
                  longitude: Number(resto.lng),
                }}
                title={resto.nombre}
              />
            </MapView>
          </View>
        ) : null}

        {/* Reseña Especial */}
        <View style={styles.descCard}>
          <View style={styles.descHeadRow}>
            <Text style={styles.descLabel}>{t("detalleResto.resena")}</Text>
            <View style={styles.togglePill}>
              <TouchableOpacity
                style={[styles.toggleBtn, localLang === "es" && { backgroundColor: theme.colors.primary }]}
                onPress={() => setLocalLang("es")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={lang === 'es' ? 'Mostrar reseña en Español' : 'Show description in Spanish'}
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
                accessibilityLabel={lang === 'es' ? 'Mostrar reseña en Inglés' : 'Show description in English'}
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
            accessibilityLabel={`${t("detalleResto.comoLlegar")} a ${resto.nombre}`}
          >
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>
              {t("detalleResto.comoLlegar")}
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
            accessibilityLabel={saved ? (lang === "es" ? "Quitar de Mi Recorrido" : "Remove from itinerary") : (lang === "es" ? "Guardar en Mi Recorrido" : "Save to itinerary")}
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={16}
              color={saved ? "#fff" : theme.colors.text}
            />
            <Text style={[styles.actionBtnText, { color: saved ? "#fff" : theme.colors.text }]}>
              {saved ? t("detalleResto.guardado") : t("detalleResto.guardar")}
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
