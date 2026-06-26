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
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useItinerary } from "../context/ItineraryContext";
import { useLang } from "../context/LangContext";
import { supabase } from "../lib/supabase";
import { useAppTheme } from "../theme/colors";

const traducciones = {
  es: {
    fotoActual: "Actual",
    fotoAntigua: "Antigua",
    sinFoto: "Foto no disponible",
    descripcion: "Descripción",
    historia: "Reseña histórica",
    comoLlegar: "Cómo llegar",
    guardar: "Guardar",
    guardado: "Guardado",
    cercanos: "Lugares cercanos",
    cargando: "Cargando información...",
  },
  en: {
    fotoActual: "Current",
    fotoAntigua: "Vintage",
    sinFoto: "Photo unavailable",
    descripcion: "Description",
    historia: "Historical review",
    comoLlegar: "Directions",
    guardar: "Save",
    guardado: "Saved",
    cercanos: "Nearby places",
    cargando: "Loading information...",
  },
};

const getCategoryIcon = (categoria: string) => {
  switch (categoria) {
    case "Museos":
      return "color-palette";
    case "Parques":
      return "leaf";
    case "Edificios historicos":
      return "business";
    case "Teatros":
      return "ticket";
    case "Cupulas":
      return "business-outline";
    case "Canchas de futbol":
      return "football";
    case "Zonas turisticas":
      return "map";
    default:
      return "location";
  }
};

export default function DetalleScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useAppTheme();

  const { lang: globalLang } = useLang();
  const [localLang, setLocalLang] = useState(globalLang);
  const t = traducciones[localLang as keyof typeof traducciones];

  // Integramos el contexto de Itinerario
  const { toggleItem, isSaved } = useItinerary();
  const saved = typeof id === "string" ? isSaved(id) : false;

  const [lugar, setLugar] = useState<any>(null);
  const [lugaresSugeridos, setLugaresSugeridos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fotoVista, setFotoVista] = useState<"actual" | "antigua">("actual");

  useEffect(() => {
    const fetchDetalle = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: lugarData, error: lugarError } = await supabase
          .from("puntos_interes")
          .select("*")
          .eq("id", id)
          .single();

        if (lugarError) throw lugarError;
        setLugar(lugarData);

        if (lugarData) {
          const { data: sugeridosData } = await supabase
            .from("puntos_interes")
            .select("id, nombre, categoria")
            .eq("comuna", lugarData.comuna)
            .neq("id", id)
            .limit(3);
          setLugaresSugeridos(sugeridosData || []);
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
          {traducciones[globalLang as keyof typeof traducciones].cargando}
        </Text>
      </SafeAreaView>
    );
  }

  const iconName = getCategoryIcon(lugar.categoria);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.8}
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
          <Image
            source={{
              uri:
                fotoVista === "actual"
                  ? lugar.foto_actual_url
                  : lugar.foto_antigua_url,
            }}
            style={StyleSheet.absoluteFill} // Esto hace que ocupe todo el espacio
            resizeMode="cover"
          />
          <View style={styles.capLabel}>
            <Text style={styles.capText}>
              {fotoVista === "actual" ? t.fotoActual : `${t.fotoAntigua}`}
            </Text>
          </View>
        </View>

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
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  fotoVista === "actual"
                    ? { color: "#fff" }
                    : { color: theme.colors.textSecondary },
                ]}
              >
                {t.fotoActual}
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
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  fotoVista === "antigua"
                    ? { color: "#fff" }
                    : { color: theme.colors.textSecondary },
                ]}
              >
                {t.fotoAntigua}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.poiTitleRow}>
          <Text style={styles.catText}>
            {lugar.categoria} · Comuna {lugar.comuna}
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

        <View style={styles.descCard}>
          <View style={styles.descHeadRow}>
            <Text style={styles.descLabel}>{t.descripcion}</Text>
            <View style={styles.togglePill}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  localLang === "es" && {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setLocalLang("es")}
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
          <Text style={styles.descLabel}>{t.historia}</Text>
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
          >
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>
              {t.comoLlegar}
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
              {saved ? t.guardado : t.guardar}
            </Text>
          </TouchableOpacity>
        </View>

        {lugaresSugeridos.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t.cercanos}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerAll: { justifyContent: "center", alignItems: "center" },
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
  locText: { fontSize: 12, color: "#8B8F7E" },
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
    color: "#8B8F7E",
    textTransform: "uppercase",
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
