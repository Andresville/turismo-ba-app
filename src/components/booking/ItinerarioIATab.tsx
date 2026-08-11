import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Text } from "react-native-paper";

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
  const { toggleItem, isSaved } = useItinerary();

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

  const toggleStyle = (code: string) => {
    setSelectedStyles((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]
    );
  };

  const handleGenerar = async () => {
    if (selectedStyles.length === 0 || cooling) return;
    setStatus("loading");
    setErrorInfo(null);
    setCooling(true);
    setTimeout(() => setCooling(false), COOLDOWN_MS);

    const result = await generateItinerary({ days, styles: selectedStyles, lang });
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
    dayByPoi.forEach((day, id) => {
      if (!isSaved(id)) toggleItem(id, day);
    });
    setSavedAll(true);
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
