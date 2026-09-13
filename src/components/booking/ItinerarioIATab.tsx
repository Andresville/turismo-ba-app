import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  LayoutAnimation,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useItinerary } from "../../context/ItineraryContext";
import { generateItinerary } from "../../lib/edge-functions";
import { offlineCache, OFFLINE_KEYS } from "../../lib/offline-cache";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "../../locales/i18n";
import { getCategoryIcon, getCategoryLabel, useAppTheme } from "../../theme/colors";
import { ItineraryDay } from "../../types/travel";
import { Lugar } from "../../types/database";

const ESTILOS = [
  { code: "cultural", key: "cultural" },
  { code: "gastronomico", key: "gastronomico" },
  { code: "bajo_presupuesto", key: "bajoPresupuesto" },
  { code: "aventura", key: "aventura" },
  { code: "deportivo", key: "deportivo" },
  { code: "aire_libre", key: "aireLibre" },
  { code: "museos", key: "museos" },
] as const;

const COOLDOWN_MS = 15000;

type Status = "form" | "loading" | "error" | "results";

export default function ItinerarioIATab() {
  const theme = useAppTheme();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const { toggleItem, isSaved, dayMap, savedItems } = useItinerary();

  const [pois, setPois] = useState<Lugar[]>([]);
  const [days, setDays] = useState(3);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("form");
  const [errorInfo, setErrorInfo] = useState<{ code: string; message: string } | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryDay[] | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [cooling, setCooling] = useState(false);
  const [savedAll, setSavedAll] = useState(false);

  useEffect(() => {
    offlineCache
      .get<Lugar[]>(OFFLINE_KEYS.PUNTOS_INTERES, async () => {
        const { data, error } = await supabase.from("puntos_interes").select("*");
        if (error) throw error;
        return data || [];
      })
      .then(({ data }) => setPois(data))
      .catch((e) => console.error("Error al cargar puntos de interés:", e));
  }, []);

  const poiById = React.useMemo(() => {
    const map: Record<string, Lugar> = {};
    pois.forEach((p) => (map[p.id] = p));
    return map;
  }, [pois]);

  // Pool de fotos para la postal de carga: cada lugar puede aportar su foto
  // actual y/o su foto antigua (dos entradas separadas), para que la rotación
  // tenga más variedad y muestre también el material histórico.
  type PostalFoto = { poi: Lugar; url: string };
  const fotosDisponibles = React.useMemo(() => {
    const arr: PostalFoto[] = [];
    pois.forEach((p) => {
      if (p.foto_actual_url) arr.push({ poi: p, url: p.foto_actual_url });
      if (p.foto_antigua_url) arr.push({ poi: p, url: p.foto_antigua_url });
    });
    return arr;
  }, [pois]);

  const [postalFoto, setPostalFoto] = useState<PostalFoto | null>(null);
  const postalOpacity = useRef(new Animated.Value(0)).current;
  // Si el usuario cierra el modal de carga con la cruz, se ignora el
  // resultado de generateItinerary cuando llegue (la request sigue en
  // vuelo del lado del servidor, pero no se aplica ningún cambio de estado).
  const canceladoRef = useRef(false);

  useEffect(() => {
    if (status !== "loading" || fotosDisponibles.length === 0) return;
    let cancelled = false;
    const pickRandom = () => fotosDisponibles[Math.floor(Math.random() * fotosDisponibles.length)];

    setPostalFoto(pickRandom());
    postalOpacity.setValue(0);
    Animated.timing(postalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    const interval = setInterval(() => {
      Animated.timing(postalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        if (cancelled) return;
        setPostalFoto(pickRandom());
        Animated.timing(postalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 2800);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, fotosDisponibles]);

  const postalDescripcion = (poi: Lugar) =>
    (lang === "en" ? poi.descripcion_en : lang === "pt" ? poi.descripcion_pt : poi.descripcion_es) || "";

  const toggleStyle = (code: string) => {
    setSelectedStyles((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]
    );
  };

  const handleGenerar = async () => {
    if (selectedStyles.length === 0 || cooling) return;
    canceladoRef.current = false;
    setStatus("loading");
    setErrorInfo(null);
    setCooling(true);
    setTimeout(() => setCooling(false), COOLDOWN_MS);

    const result = await generateItinerary({ days, styles: selectedStyles, lang });
    if (canceladoRef.current) return;
    if (result.success) {
      setItinerary(result.data.dias);
      setExpandedDay(result.data.dias[0]?.dia ?? null);
      setSavedAll(false);
      setStatus("results");
    } else {
      setErrorInfo(result.error);
      setStatus("error");
    }
  };

  const handleCancelarCarga = () => {
    canceladoRef.current = true;
    setStatus("form");
  };

  const handleNuevo = () => {
    setStatus("form");
    setItinerary(null);
    setErrorInfo(null);
  };

  const handleGuardarTodo = () => {
    if (!itinerary) return;
    // Un mismo poi_id podría repetirse entre días (caso raro); se queda con
    // el primer día en que aparece.
    const dayByPoi = new Map<string, number>();
    itinerary.forEach((day) => {
      day.paradas.forEach((parada) => {
        if (!dayByPoi.has(parada.poi_id)) dayByPoi.set(parada.poi_id, day.dia);
      });
    });

    // Lugares que vienen de un itinerario IA guardado anteriormente (tienen
    // día asignado en dayMap). Si esta nueva generación se guarda, esos se
    // reemplazan — los guardados a mano (sin día, corazón) nunca se tocan.
    const idsItinerarioAnterior = Object.keys(dayMap);

    const guardar = () => {
      // Set local sincrónico de qué queda guardado: no se puede usar
      // isSaved()/savedItems (estado de React) para decidir los toggleItem
      // siguientes en el mismo tick, porque ese estado no se actualiza hasta
      // el próximo render — mismo motivo por el que ItineraryContext usa un
      // ref interno en vez de leer su propio estado dentro de toggleItem.
      const guardadosAhora = new Set(savedItems);

      idsItinerarioAnterior.forEach((id) => {
        toggleItem(id);
        guardadosAhora.delete(id);
      });

      dayByPoi.forEach((day, id) => {
        if (!guardadosAhora.has(id)) {
          toggleItem(id, day);
          guardadosAhora.add(id);
        }
      });

      setSavedAll(true);
    };

    if (idsItinerarioAnterior.length > 0) {
      Alert.alert(
        lang === "es"
          ? "¿Reemplazar itinerario guardado?"
          : lang === "pt"
          ? "Substituir roteiro salvo?"
          : "Replace saved itinerary?",
        lang === "es"
          ? "Ya tenés un itinerario guardado. Guardar este lo va a reemplazar. Los lugares guardados de forma individual no se van a tocar."
          : lang === "pt"
          ? "Você já tem um roteiro salvo. Salvar este vai substituí-lo. Os lugares salvos individualmente não serão afetados."
          : "You already have a saved itinerary. Saving this one will replace it. Places saved individually won't be affected.",
        [
          { text: lang === "es" ? "Cancelar" : lang === "pt" ? "Cancelar" : "Cancel", style: "cancel" },
          {
            text: lang === "es" ? "Reemplazar" : lang === "pt" ? "Substituir" : "Replace",
            onPress: guardar,
          },
        ]
      );
    } else {
      guardar();
    }
  };

  const errorMessage = () => {
    if (!errorInfo) return "";
    if (errorInfo.code === "RATE_LIMITED") return t("alojamientos.itinerario.rateLimited");
    if (errorInfo.code === "NO_RESULTS") return t("alojamientos.itinerario.sinResultados");
    return t("alojamientos.itinerario.error");
  };

  if (status === "results" && itinerary) {
    return (
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: savedAll ? theme.colors.success : theme.colors.primary }]}
          onPress={handleGuardarTodo}
          activeOpacity={0.85}
        >
          <Ionicons name={savedAll ? "checkmark-circle" : "heart"} size={16} color="#fff" />
          <Text style={styles.btnText}>
            {savedAll
              ? t("alojamientos.itinerario.guardado")
              : t("alojamientos.itinerario.guardarRecorrido")}
          </Text>
        </TouchableOpacity>

        {itinerary.map((day) => {
          const isOpen = expandedDay === day.dia;
          return (
            <Card
              key={day.dia}
              style={[styles.dayCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpandedDay(isOpen ? null : day.dia);
              }}
            >
              <Card.Content style={styles.dayHeader}>
                <Text style={[styles.dayLabel, { color: theme.colors.secondary }]}>
                  {`DÍA ${day.dia}`}
                  {day.titulo ? ` — ${day.titulo}` : ""}
                </Text>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </Card.Content>

              {isOpen && (
                <View style={styles.paradasWrap}>
                  {day.paradas.map((parada, idx) => {
                    const poi = poiById[parada.poi_id];
                    if (!poi) return null;
                    return (
                      <TouchableOpacity
                        key={`${day.dia}-${parada.poi_id}-${idx}`}
                        style={[styles.paradaRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
                        onPress={() => router.push({ pathname: "/detalle", params: { id: poi.id } })}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={getCategoryIcon(poi.categoria) as any}
                          size={16}
                          color={theme.colors.primary}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.paradaNombre}>{poi.nombre}</Text>
                          <Text style={styles.paradaSub}>
                            {[parada.horario_sugerido, getCategoryLabel(poi.categoria, lang)]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                          {!!parada.motivo && <Text style={styles.paradaMotivo}>{parada.motivo}</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </Card>
          );
        })}

        <TouchableOpacity style={styles.linkBtn} onPress={handleNuevo} activeOpacity={0.7}>
          <Text style={[styles.linkBtnText, { color: theme.colors.primary }]}>
            ↻ {t("alojamientos.itinerario.generar")}
          </Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
      <View style={[styles.formCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={styles.label}>{t("alojamientos.itinerario.cuantosDias")}</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepperBtn, { borderColor: theme.colors.primary }]}
            onPress={() => setDays((d) => Math.max(1, d - 1))}
            activeOpacity={0.7}
          >
            <Text style={[styles.stepperBtnText, { color: theme.colors.primary }]}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepperValue}>
            {days} <Text style={styles.stepperUnit}>{t("alojamientos.itinerario.dias")}</Text>
          </Text>
          <TouchableOpacity
            style={[styles.stepperBtn, { borderColor: theme.colors.primary }]}
            onPress={() => setDays((d) => Math.min(7, d + 1))}
            activeOpacity={0.7}
          >
            <Text style={[styles.stepperBtnText, { color: theme.colors.primary }]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.formCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={styles.label}>{t("alojamientos.itinerario.estilo")}</Text>
        <View style={styles.chipWrap}>
          {ESTILOS.map((estilo) => {
            const selected = selectedStyles.includes(estilo.code);
            return (
              <TouchableOpacity
                key={estilo.code}
                style={[
                  styles.chip,
                  { borderColor: theme.colors.border },
                  selected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                ]}
                onPress={() => toggleStyle(estilo.code)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: selected ? "#fff" : theme.colors.textSecondary }]}>
                  {t(`alojamientos.itinerario.estilos.${estilo.key}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.btn,
          { backgroundColor: theme.colors.primary },
          (selectedStyles.length === 0 || status === "loading" || cooling) && { opacity: 0.5 },
        ]}
        onPress={handleGenerar}
        disabled={selectedStyles.length === 0 || status === "loading" || cooling}
        activeOpacity={0.85}
      >
        {status === "loading" ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="sparkles" size={16} color="#fff" />
        )}
        <Text style={styles.btnText}>
          {status === "loading"
            ? t("alojamientos.itinerario.generando")
            : t("alojamientos.itinerario.generar")}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={status === "loading"}
        transparent
        animationType="fade"
        onRequestClose={handleCancelarCarga}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={handleCancelarCarga}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.modalBody}>
            {postalFoto && (
              <Animated.View style={[styles.modalPhotoWrap, { opacity: postalOpacity }]}>
                <ImageBackground
                  source={{ uri: postalFoto.url }}
                  style={styles.modalPhoto}
                  imageStyle={styles.modalPhotoInner}
                />
              </Animated.View>
            )}

            {postalFoto && (
              <View style={styles.modalCaption}>
                <Text style={styles.modalNombre} numberOfLines={1}>
                  {postalFoto.poi.nombre}
                </Text>
                <Text style={styles.modalDesc} numberOfLines={3}>
                  {postalDescripcion(postalFoto.poi)}
                </Text>
              </View>
            )}

            <View style={styles.modalStatusRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.modalStatusText}>{t("alojamientos.itinerario.generando")}</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {selectedStyles.length === 0 && (
        <Text style={styles.hint}>{t("alojamientos.itinerario.eligeEstilo")}</Text>
      )}

      {status === "error" && (
        <View style={[styles.errorBox, { borderColor: theme.colors.border }]}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.colors.secondary} />
          <Text style={styles.errorText}>{errorMessage()}</Text>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollArea: { flex: 1, paddingHorizontal: 18, paddingTop: 14 },
  formCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  label: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "bold",
    color: "#5A5E50",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22 },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: { fontSize: 18, fontWeight: "bold" },
  stepperValue: { fontSize: 22, fontWeight: "bold", color: "#1B2330" },
  stepperUnit: { fontSize: 12, fontWeight: "600", color: "#5B6270" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  chipText: { fontSize: 12, fontWeight: "bold" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
    marginBottom: 8,
  },
  btnText: { color: "#fff", fontSize: 13.5, fontWeight: "bold" },
  hint: { fontSize: 11, color: "#8B8F7E", textAlign: "center", marginBottom: 8 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  errorText: { flex: 1, fontSize: 12.5, color: "#1B2330" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(8,10,16,0.8)",
  },
  modalCloseBtn: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    borderRadius: 20,
    marginTop: 8,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  modalBody: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalPhotoWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  modalPhoto: { width: "100%", height: "100%" },
  modalPhotoInner: { resizeMode: "contain" },
  modalCaption: { marginTop: 18, alignItems: "center" },
  modalNombre: { fontSize: 17, fontWeight: "bold", color: "#fff", textAlign: "center" },
  modalDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    lineHeight: 18,
    textAlign: "center",
  },
  modalStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 26,
  },
  modalStatusText: { fontSize: 12.5, fontWeight: "bold", color: "rgba(255,255,255,0.85)" },
  dayCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  dayLabel: {
    fontFamily: "monospace",
    fontSize: 11.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    flex: 1,
  },
  paradasWrap: { paddingHorizontal: 14, paddingBottom: 12 },
  paradaRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
  paradaNombre: { fontSize: 13, fontWeight: "bold", color: "#1B2330" },
  paradaSub: { fontSize: 10.5, color: "#8B8F7E", fontFamily: "monospace", marginTop: 1 },
  paradaMotivo: { fontSize: 11.5, color: "#5B6270", marginTop: 3, lineHeight: 16 },
  linkBtn: { alignItems: "center", paddingVertical: 10 },
  linkBtnText: { fontSize: 12.5, fontWeight: "bold" },
});
