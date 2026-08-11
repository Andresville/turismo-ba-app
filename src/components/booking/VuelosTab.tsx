import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";

import { DESTINOS_DESDE_BA, FlightRoute, ORIGENES_HACIA_BA } from "../../constants/flightDestinations";
import { searchFlights } from "../../lib/edge-functions";
import { PlaceResult, searchPlaces } from "../../lib/places-autocomplete";
import { useTranslation } from "../../locales/i18n";
import { useAppTheme } from "../../theme/colors";
import { EdgeFunctionError, FlightDirection, FlightsSearchData } from "../../types/travel";

type Status = "idle" | "loading" | "results" | "empty" | "error";

const SEARCH_DEBOUNCE_MS = 350;

export default function VuelosTab() {
  const theme = useAppTheme();
  const { t, lang } = useTranslation();

  const [direction, setDirection] = useState<FlightDirection>("from_ba");
  const [selectedRoute, setSelectedRoute] = useState<FlightRoute | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<FlightsSearchData | null>(null);
  const [errorInfo, setErrorInfo] = useState<EdgeFunctionError | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rutas = direction === "from_ba" ? DESTINOS_DESDE_BA : ORIGENES_HACIA_BA;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(searchTerm, lang);
      setSearchResults(results);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, lang]);

  const handleDirection = (next: FlightDirection) => {
    if (next === direction) return;
    setDirection(next);
    setSelectedRoute(null);
    setStatus("idle");
    setData(null);
    setErrorInfo(null);
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleSelectRoute = async (route: FlightRoute) => {
    setSelectedRoute(route);
    setStatus("loading");
    setErrorInfo(null);
    setSearchTerm("");
    setSearchResults([]);
    const result = await searchFlights({ direction, route: route.iata, lang });
    if (result.success) {
      setData(result.data);
      setStatus("results");
    } else {
      setErrorInfo(result.error);
      setStatus(result.error.code === "NO_OFFERS" ? "empty" : "error");
    }
  };

  const handleSelectPlace = (place: PlaceResult) => {
    handleSelectRoute({
      iata: place.code,
      label: place.cityName || place.name,
      subtitle: place.countryName || place.name,
    });
  };

  const handleVerOferta = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error("Error al abrir navegador web:", e);
      Linking.openURL(url);
    }
  };

  return (
    <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
      <View style={[styles.togglePill, { borderColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.toggleBtn, direction === "from_ba" && { backgroundColor: theme.colors.primary }]}
          onPress={() => handleDirection("from_ba")}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, { color: direction === "from_ba" ? "#fff" : theme.colors.textSecondary }]}>
            {t("alojamientos.vuelos.desdeBA")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, direction === "to_ba" && { backgroundColor: theme.colors.primary }]}
          onPress={() => handleDirection("to_ba")}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, { color: direction === "to_ba" ? "#fff" : theme.colors.textSecondary }]}>
            {t("alojamientos.vuelos.haciaBA")}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>
        {direction === "from_ba"
          ? t("alojamientos.vuelos.elegirDestino")
          : t("alojamientos.vuelos.elegirOrigen")}
      </Text>

      <View style={[styles.searchBox, { borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("alojamientos.vuelos.buscarPlaceholder")}
          placeholderTextColor={theme.colors.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searching && <ActivityIndicator size="small" color={theme.colors.primary} />}
        {!searching && searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {searchResults.length > 0 && (
        <View style={[styles.dropdown, { borderColor: theme.colors.border }]}>
          {searchResults.map((place, idx) => (
            <TouchableOpacity
              key={`${place.code}-${idx}`}
              style={[styles.dropdownRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
              onPress={() => handleSelectPlace(place)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={place.type === "airport" ? "airplane-outline" : "business-outline"}
                size={15}
                color={theme.colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownName}>{place.name}</Text>
                <Text style={styles.dropdownSub}>
                  {[place.cityName, place.countryName].filter(Boolean).join(", ")}
                </Text>
              </View>
              <Text style={styles.dropdownCode}>{place.code}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={[styles.label, { marginTop: 6 }]}>{t("alojamientos.vuelos.populares")}</Text>
      <View style={styles.chipWrap}>
        {rutas.map((route) => {
          const selected = selectedRoute?.iata === route.iata;
          return (
            <TouchableOpacity
              key={route.iata}
              style={[
                styles.routeChip,
                { borderColor: theme.colors.border },
                selected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}
              onPress={() => handleSelectRoute(route)}
              activeOpacity={0.8}
            >
              <Text style={[styles.routeChipLabel, { color: selected ? "#fff" : theme.colors.text }]}>
                {route.label}
              </Text>
              <Text style={[styles.routeChipSub, { color: selected ? "rgba(255,255,255,0.8)" : theme.colors.textSecondary }]}>
                {route.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {status === "loading" && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t("alojamientos.vuelos.cargando")}</Text>
        </View>
      )}

      {status === "empty" && (
        <View style={[styles.errorBox, { borderColor: theme.colors.border }]}>
          <Ionicons name="airplane-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.errorText}>{t("alojamientos.vuelos.sinResultados")}</Text>
        </View>
      )}

      {status === "error" && (
        <View style={[styles.errorBox, { borderColor: theme.colors.border }]}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.colors.secondary} />
          <Text style={styles.errorText}>{errorInfo?.message || t("alojamientos.vuelos.error")}</Text>
        </View>
      )}

      {status === "results" && data && (
        <View style={[styles.resultCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.heroRow}>
            <Text style={styles.heroLabel}>{t("alojamientos.vuelos.desde")}</Text>
            <Text style={[styles.heroPrice, { color: theme.colors.secondary }]}>
              USD {Math.round(data.price)}
            </Text>
            <Text style={styles.heroSub}>{t("alojamientos.vuelos.fechaAprox")}</Text>
          </View>

          <Text style={styles.disclaimer}>{t("alojamientos.vuelos.disclaimer")}</Text>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.secondary }]}
            onPress={() => handleVerOferta(data.deepLink)}
            activeOpacity={0.85}
          >
            <Ionicons name="search" size={16} color="#fff" />
            <Text style={styles.btnText}>{t("alojamientos.vuelos.buscarAviasales")}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollArea: { flex: 1, paddingHorizontal: 18, paddingTop: 14 },
  togglePill: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 7, alignItems: "center" },
  toggleBtnText: { fontSize: 12.5, fontWeight: "bold" },
  label: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "bold",
    color: "#5A5E50",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#1B2330" },
  dropdown: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
  },
  dropdownRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownName: { fontSize: 12.5, fontWeight: "bold", color: "#1B2330" },
  dropdownSub: { fontSize: 10.5, color: "#8B8F7E", marginTop: 1 },
  dropdownCode: { fontSize: 11, fontWeight: "bold", fontFamily: "monospace", color: "#5B6270" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  routeChip: {
    width: "31%",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  routeChipLabel: { fontSize: 12, fontWeight: "bold", textAlign: "center" },
  routeChipSub: { fontSize: 9.5, marginTop: 2, textAlign: "center" },
  centerBox: { alignItems: "center", paddingVertical: 24 },
  loadingText: { marginTop: 8, fontSize: 12, color: "#8B8F7E" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  errorText: { flex: 1, fontSize: 12.5, color: "#1B2330" },
  resultCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  heroRow: { alignItems: "center", marginBottom: 12 },
  heroLabel: {
    fontFamily: "monospace",
    fontSize: 10,
    color: "#8B8F7E",
    textTransform: "uppercase",
  },
  heroPrice: { fontSize: 28, fontWeight: "bold", marginTop: 2 },
  heroSub: { fontSize: 11, color: "#5B6270", marginTop: 2 },
  disclaimer: {
    fontSize: 10.5,
    color: "#8B8F7E",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
});
