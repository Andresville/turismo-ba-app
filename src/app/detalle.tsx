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
import { useAppTheme, getCategoryIcon, getCategoryLabel } from "../theme/colors";
import { useTranslation } from "../locales/i18n";
import { Lugar } from "../types/database";
import { offlineCache, OFFLINE_KEYS } from "../lib/offline-cache";

export default function DetalleScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useAppTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();

  // Integramos el contexto de Itinerario
  const { toggleItem, isSaved } = useItinerary();
  const saved = typeof id === "string" ? isSaved(id) : false;

  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [lugaresSugeridos, setLugaresSugeridos] = useState<Lugar[]>([]);
  const [loading, setLoading] = useState(true);
  const [fotoVista, setFotoVista] = useState<"actual" | "antigua">("actual");
  const [localLang, setLocalLang] = useState(lang);

  useEffect(() => {
    // Sincronizar localLang cuando cambie la global
    setLocalLang(lang);
  }, [lang]);

  useEffect(() => {
    const fetchDetalle = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: allLugares } = await offlineCache.get<Lugar[]>(
          OFFLINE_KEYS.PUNTOS_INTERES,
          async () => {
            const { data: dbData, error } = await supabase
              .from("puntos_interes")
              .select("*");
            if (error) throw error;
            return dbData || [];
          }
        );
        
        const lugarData = allLugares.find((l) => l.id === id);
        if (lugarData) {
          setLugar(lugarData);
          const sugeridosData = allLugares
            .filter((l) => l.comuna === lugarData.comuna && l.id !== id)
            .slice(0, 3);
          setLugaresSugeridos(sugeridosData);
        }
      } catch (error) {
        console.error("Error al cargar detalle:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetalle();
  }, [id]);

  // Función para abrir NUESTRO mapa nativo con el destino
  const openMaps = () => {
    if (lugar?.lat && lugar?.lng) {
      router.push({
        pathname: "/mapa",
        params: {
          destinoLat: lugar.lat,
          destinoLng: lugar.lng,
          destinoNombre: lugar.nombre,
        },
      });
    }
  };

  if (loading || !lugar) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          styles.centerAll,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>
          {t("detalle.cargando")}
        </Text>
      </SafeAreaView>
    );
  }

  const iconName = getCategoryIcon(lugar.categoria);
  const tieneAmbasFotos = !!(lugar.foto_actual_url && lugar.foto_antigua_url);
  const fotoUrlAMostrar = tieneAmbasFotos ? (fotoVista === "actual" ? lugar.foto_actual_url : lugar.foto_antigua_url) : (lugar.foto_actual_url || lugar.foto_antigua_url);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
        <View
          style={[
            styles.heroPhoto,
            { backgroundColor: fotoVista === "actual" ? "#1F4778" : "#8B7E63" },
          ]}
        >
          {fotoUrlAMostrar ? (
            <Image
              source={{ uri: fotoUrlAMostrar }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.centerAll, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="image-outline" size={64} color="#fff" />
            </View>
          )}
          {tieneAmbasFotos && (
            <View style={styles.capLabel}>
              <Text style={styles.capText}>
                {fotoVista === "actual" ? t("detalle.fotoActual") : `${t("detalle.fotoAntigua")}`}
              </Text>
            </View>
          )}
        </View>

        {tieneAmbasFotos && (
          <View style={styles.toggleRowRight}>
            <View style={styles.togglePill}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  fotoVista === "actual" && {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setFotoVista("actual")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={lang === 'es' ? 'Mostrar foto actual' : 'Show current photo'}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    fotoVista === "actual"
                      ? { color: "#fff" }
                      : { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("detalle.fotoActual")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  fotoVista === "antigua" && {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setFotoVista("antigua")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={lang === 'es' ? 'Mostrar foto antigua' : 'Show historic photo'}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    fotoVista === "antigua"
                      ? { color: "#fff" }
                      : { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("detalle.fotoAntigua")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.poiTitleRow}>
          <Text style={styles.catText}>
            {getCategoryLabel(lugar.categoria, localLang)} · Comuna {lugar.comuna}
          </Text>
          <Text style={styles.titleText}>{lugar.nombre}</Text>
          <Text style={styles.locText}>
            <Ionicons
              name="location-sharp"
              size={12}
              color={theme.colors.textSecondary}
            />{" "}
            {lugar.direccion}
          </Text>
        </View>

        {/* Previsualización del mapa (Minimapa de usabilidad) */}
        <View style={styles.miniMapContainer}>
          <MapView
            style={styles.miniMap}
            region={{
              latitude: lugar.lat,
              longitude: lugar.lng,
              latitudeDelta: 0.004,
              longitudeDelta: 0.004,
            }}
            cameraZoomRange={{
              minCenterCoordinateDistance: 100,
              maxCenterCoordinateDistance: 200,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker
              coordinate={{ latitude: lugar.lat, longitude: lugar.lng }}
              title={lugar.nombre}
            />
          </MapView>
        </View>

        <View style={styles.descCard}>
          <View style={styles.descHeadRow}>
            <Text style={styles.descLabel}>{t("detalle.descripcion")}</Text>
            <View style={styles.togglePill}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  localLang === "es" && {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setLocalLang("es")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={lang === 'es' ? 'Mostrar reseña en Español' : 'Show description in Spanish'}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    localLang === "es"
                      ? { color: "#fff" }
                      : { color: theme.colors.textSecondary },
                  ]}
                >
                  ES
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  localLang === "en" && {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setLocalLang("en")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={lang === 'es' ? 'Mostrar reseña en Inglés' : 'Show description in English'}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    localLang === "en"
                      ? { color: "#fff" }
                      : { color: theme.colors.textSecondary },
                  ]}
                >
                  EN
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.descBody}>
            {localLang === "es" ? lugar.descripcion_es : lugar.descripcion_en}
          </Text>
        </View>

        <View style={styles.descCard}>
          <Text style={styles.descLabel}>{t("detalle.historia")}</Text>
          <Text style={[styles.descBody, { marginTop: 8 }]}>
            {localLang === "es" ? lugar.historia_es : lugar.historia_en}
          </Text>
        </View>

        {/* --- NUEVA LÓGICA DE BOTONES --- */}
        <View style={styles.actionRow}>
          {/* Botón Cómo Llegar */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: theme.colors.secondary },
            ]}
            activeOpacity={0.8}
            onPress={openMaps}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${t("detalle.comoLlegar")} a ${lugar.nombre}`}
          >
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>
              {t("detalle.comoLlegar")}
            </Text>
          </TouchableOpacity>

          {/* Botón Guardar / Guardado */}
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
            onPress={() => toggleItem(lugar.id)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={saved ? (lang === "es" ? "Quitar de Mi Recorrido" : "Remove from itinerary") : (lang === "es" ? "Guardar en Mi Recorrido" : "Save to itinerary")}
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={16}
              color={saved ? "#fff" : theme.colors.text}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: saved ? "#fff" : theme.colors.text },
              ]}
            >
              {saved ? t("detalle.guardado") : t("detalle.guardar")}
            </Text>
          </TouchableOpacity>
        </View>

        {lugaresSugeridos.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t("detalle.cercanos")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.hScroll}
              contentContainerStyle={{ paddingRight: 18 }}
            >
              {lugaresSugeridos.map((sug) => (
                <TouchableOpacity
                  key={sug.id}
                  style={styles.poiCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: "/detalle",
                      params: { id: sug.id },
                    })
                  }
                >
                  <View
                    style={[
                      styles.poiThumb,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(sug.categoria) as any}
                      size={28}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.poiBody}>
                    <Text style={styles.sugName} numberOfLines={1}>
                      {sug.nombre}
                    </Text>
                    <Text style={styles.sugType} numberOfLines={1}>
                      {String(sug.categoria).toUpperCase()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      <BottomNavBar activeTab={0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerAll: { justifyContent: "center", alignItems: "center" },
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
  },
  capLabel: {
    position: "absolute",
    bottom: 12,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  capText: { color: "#fff", fontSize: 10, fontFamily: "monospace" },
  toggleRowRight: {
    alignItems: "flex-end",
    paddingHorizontal: 18,
    marginTop: -16,
    zIndex: 5,
  },
  togglePill: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D9D2BC",
    borderRadius: 9,
    padding: 3,
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  toggleBtnText: {
    fontSize: 10.5,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  poiTitleRow: { paddingHorizontal: 18, paddingTop: 10 },
  catText: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "bold",
    color: "#C9542A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1B2330",
    marginVertical: 6,
  },
  locText: { fontSize: 12, color: "#5A5E50" },
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
  descBody: { fontSize: 14, lineHeight: 22, color: "#1B2330" },
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
  actionBtnText: { fontSize: 13, fontWeight: "bold" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#8B8F7E",
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 18,
    letterSpacing: 0.5,
    fontFamily: "monospace",
  },
  hScroll: { paddingLeft: 18, overflow: "visible" },
  poiCard: {
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#D9D2BC",
    overflow: "hidden",
  },
  poiThumb: { height: 74, justifyContent: "center", alignItems: "center" },
  poiBody: { padding: 10 },
  sugName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1B2330",
    marginBottom: 4,
  },
  sugType: { fontSize: 9, color: "#8B8F7E", fontFamily: "monospace" },
});
