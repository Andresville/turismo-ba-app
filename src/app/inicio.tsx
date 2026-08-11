import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AppLogo from "../components/AppLogo";
import BottomNavBar from "../components/BottomNavBar";

import { ErrorState, OfflineBanner } from "../components/connection-status";
import { useLocation } from "../context/LocationContext";
import { OFFLINE_KEYS, offlineCache } from "../lib/offline-cache";
import { supabase } from "../lib/supabase";
import { useTranslation } from "../locales/i18n";
import { getCategoryBadgeColors, getCategoryColor, getCategoryIcon, getCategoryLabel, useAppTheme } from "../theme/colors";
import { Lugar } from "../types/database";
import { normalizeForSearch } from "../utils/text";

const DB_CATEGORIAS = [
  "Museos",
  "Parques",
  "Cupulas",
  "Edificios historicos",
  "Teatros",
  "Zonas turisticas",
  "Deportes",
  "recorrido",
];

const calcularDistancia = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const formatDistancia = (metros: number) => {
  if (metros < 1000) return `${metros} m`;
  return `${(metros / 1000).toFixed(1)} km`;
};

const getVisualConfig = (categoria: string, isResto: boolean) => {
  if (isResto) return { icon: "restaurant", color: "#C9542A" };
  return {
    icon: getCategoryIcon(categoria),
    color: getCategoryColor(categoria),
  };
};

export default function InicioScreen() {
  const theme = useAppTheme();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const { location, placeName } = useLocation();
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchInputRef = React.useRef<TextInput>(null);

  const [lugaresBd, setLugaresBd] = useState<Lugar[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const catIcons = [
    "color-palette-outline",
    "leaf-outline",
    "business-outline",
    "business",
    "ticket-outline",
    "map-outline",
    "trophy-outline",
    "trail-sign-outline",
  ];

  const fetchDatos = async () => {
    setLoading(true);
    setErrorLoading(false);
    try {
      const { data, isOffline: offline } = await offlineCache.get<Lugar[]>(
        OFFLINE_KEYS.PUNTOS_INTERES,
        async () => {
          const { data: dbData, error } = await supabase
            .from("puntos_interes")
            .select("*");
          if (error) throw error;
          return dbData || [];
        }
      );
      setLugaresBd(data);
      setIsOffline(offline);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setErrorLoading(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
    setCategoriaFiltro(null);
    setSearchQuery("");
  }, []);

  // Lógica inteligente de filtrado y visualización
  const lugaresMostrados = useMemo(() => {
    let lista = [...lugaresBd];

    // 1. Siempre calculamos la distancia primero para que la tarjeta la pueda mostrar
    const listaConDistancia = lista.map((lugar) => {
      const dist =
        location && lugar.lat && lugar.lng
          ? calcularDistancia(
            location.coords.latitude,
            location.coords.longitude,
            lugar.lat,
            lugar.lng,
          )
          : 0;
      return { ...lugar, dist };
    });

    // 2. Si el usuario escribió algo, buscamos texto (Muestra TODOS los coincidentes)
    if (searchQuery.trim().length > 0) {
      const query = normalizeForSearch(searchQuery);
      // Ordenamos alfabéticamente los resultados
      return listaConDistancia
        .filter((l) => normalizeForSearch(l.nombre).includes(query))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    // 3. Si no hay búsqueda pero seleccionó una categoría (Muestra TODOS los de esa categoría)
    if (categoriaFiltro) {
      return listaConDistancia
        .filter((l) => l.categoria === categoriaFiltro)
        .sort((a, b) => a.dist - b.dist); // Los mostramos ordenados por cercanía
    }

    // 4. Si no buscó ni filtró (ESTADO POR DEFECTO), mostramos solo los 6 más cercanos
    if (location) {
      listaConDistancia.sort((a, b) => a.dist - b.dist);
    }
    return listaConDistancia.slice(0, 6);
  }, [lugaresBd, categoriaFiltro, searchQuery, location]);

  const handleCategoriaPress = (index: number) => {
    const dbCat = DB_CATEGORIAS[index];
    if (dbCat === "recorrido") {
      router.push("/recorrido" as any);
      return;
    }

    setCategoriaFiltro((prev) => (prev === dbCat ? null : dbCat));
    setSearchQuery(""); // Limpiamos la búsqueda si toca una categoría
    Keyboard.dismiss();
  };

  // Determinar dinámicamente el título de la sección inferior
  const getTituloSeccion = () => {
    if (searchQuery.trim().length > 0) return t("inicio.resultadosBusqueda");
    if (categoriaFiltro) {
      const idx = DB_CATEGORIAS.indexOf(categoriaFiltro);
      return (t("inicio.categorias") as string[])[idx];
    }
    return t("inicio.cercaTitulo");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <OfflineBanner isOffline={isOffline} />
      <View
        style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AppLogo />
          <View>
            <Text style={styles.chapaTitle}>
              {lang === "en"
                ? "Buenos Aires Tourism"
                : lang === "pt"
                ? "Turismo em Buenos Aires"
                : "Turismo Buenos Aires"}
            </Text>
            <Text style={styles.chapaSub}>
              <Ionicons name="location-sharp" size={12} color="#C7D2E3" />
              {placeName
                ? ` ${t("inicio.ubicacionPrefix")} ${placeName}`
                : ` ${t("inicio.ubicacionDefault")}`}
            </Text>
          </View>
        </View>
      </View>

      {errorLoading ? (
        <ErrorState onRetry={fetchDatos} />
      ) : (
        <ScrollView
          style={styles.scrollArea}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Barra de Búsqueda conectada al estado */}
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={18}
              color={theme.colors.textSecondary}
            />
            <TextInput
              ref={searchInputRef}
              placeholder={t("inicio.buscar")}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text.length > 0) setCategoriaFiltro(null);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={{ padding: 4 }}
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionLabel}>{t("inicio.catTitulo")}</Text>
          <View style={styles.catGrid}>
            {(t("inicio.categorias") as string[]).map((cat, index) => {
              const isFiltroActivo = categoriaFiltro === DB_CATEGORIAS[index];
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.catTile,
                    isFiltroActivo && {
                      borderColor: theme.colors.primary,
                      backgroundColor: "#E4ECF7",
                    },
                  ]}
                  onPress={() => handleCategoriaPress(index)}
                >
                  <Ionicons
                    name={catIcons[index] as any}
                    size={20}
                    color={
                      isFiltroActivo
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.catTileText,
                      {
                        color: isFiltroActivo
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cabecera de resultados */}
          <View style={styles.cercaTuyoHeader}>
            <Text style={styles.sectionLabel}>{getTituloSeccion()}</Text>
            {(categoriaFiltro || searchQuery.length > 0) && (
              <TouchableOpacity
                onPress={() => {
                  setCategoriaFiltro(null);
                  setSearchQuery("");
                }}
              >
                <Text style={styles.clearFilter}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>{t("inicio.cargando")}</Text>
            </View>
          ) : lugaresMostrados.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t("inicio.sinResultados")}</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {lugaresMostrados.map((lugar) => {
                const tipo = lugar.categoria;
                const config = getVisualConfig(tipo, false);
                const labelExhibido = getCategoryLabel(tipo, lang);
                const badgeColors = getCategoryBadgeColors(tipo);
                const fotoUrl = lugar.foto_actual_url || lugar.foto_antigua_url;

                return (
                  <Card
                    key={lugar.id}
                    style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => {
                      router.push({
                        pathname: "/detalle",
                        params: { id: lugar.id },
                      });
                    }}
                  >
                    <View style={styles.photoContainer}>
                      {fotoUrl ? (
                        <Image source={{ uri: fotoUrl }} style={styles.cardImage} contentFit="cover" transition={200} />
                      ) : (
                        <View style={[styles.placeholderPhoto, { backgroundColor: theme.colors.background }]}>
                          <Ionicons name={config.icon as any} size={32} color={theme.colors.textSecondary} />
                        </View>
                      )}
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: badgeColors.bg,
                            borderColor: badgeColors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: badgeColors.text }]}>
                          {labelExhibido}
                        </Text>
                      </View>
                    </View>

                    <Card.Content style={styles.cardBody}>
                      <View style={styles.nameRow}>
                        <Text style={styles.restName} numberOfLines={1}>
                          {lugar.nombre}
                        </Text>
                        {location && (
                          <View style={styles.distPill}>
                            <Text style={styles.distText}>
                              {formatDistancia(lugar.dist)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {lugar.direccion || "Dirección no disponible"}
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <BottomNavBar activeTab={0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chapaBar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chapaTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  chapaSub: {
    fontSize: 11,
    color: "#C7D2E3",
    marginTop: 2,
    fontFamily: "monospace",
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollArea: { flex: 1, paddingHorizontal: 18 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#D9D2BC",
  },
  searchInput: { flex: 1, marginLeft: 9, fontSize: 13, color: "#1B2330" },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 3,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#D9D2BC",
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  segText: { fontSize: 12.5, fontWeight: "600" },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: "bold",
    color: "#8B8F7E",
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 0.5,
    fontFamily: "monospace",
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  catTile: {
    width: "22%",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9D2BC",
  },
  catTileText: {
    fontSize: 9.5,
    color: "#5B6270",
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 12,
  },
  cercaTuyoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  clearFilter: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#C9542A",
    marginBottom: 8,
  },
  listContainer: {
    paddingTop: 8,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    elevation: 0,
    marginBottom: 8,
  },
  photoContainer: {
    height: 140,
    position: "relative",
    backgroundColor: "#ccc",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  placeholderPhoto: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    fontFamily: "monospace",
  },
  cardBody: {
    padding: 12,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1B2330",
    flex: 1,
    marginRight: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  infoText: {
    fontSize: 11.5,
    flex: 1,
  },
  distPill: {
    backgroundColor: "#EFEADD",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 5,
  },
  distText: {
    color: "#1F4778",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderColor: "#D9D2BC",
  },
  navItem: { flex: 1, alignItems: "center", gap: 3 },
  navText: { fontSize: 8.5, fontWeight: "bold", color: "#8B8F7E" },
  loadingContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 8, fontSize: 12, color: "#8B8F7E" },
});
