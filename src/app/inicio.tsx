import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import BottomNavBar from "../components/BottomNavBar";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLang } from "../context/LangContext";
import { useLocation } from "../context/LocationContext";
import { supabase } from "../lib/supabase";
import { useAppTheme } from "../theme/colors";

const DB_CATEGORIAS = [
  "Museos",
  "Parques",
  "Cupulas",
  "Edificios historicos",
  "Teatros",
  "Canchas de futbol",
  "Zonas turisticas",
  "recorrido",
];

const traducciones = {
  es: {
    ciudad: "Buenos Aires",
    ubicacionPrefix: "estás en",
    ubicacionDefault: "Buscando ubicación...",
    buscar: "Buscar lugar, comuna o zona…",
    tabTuristico: "Turístico",
    tabResto: "Restaurantes",
    catTitulo: "Categorías",
    categorias: [
      "Museos",
      "Parques",
      "Cúpulas",
      "Edificios",
      "Teatros",
      "Canchas",
      "Zonas turísticas",
      "Mi recorrido",
    ],
    cercaTitulo: "Cerca tuyo",
    resultadosBusqueda: "Resultados de búsqueda",
    cargando: "Buscando lugares...",
    sinResultados: "No se encontraron lugares.",
    nav: ["Inicio", "Mapa", "Transporte", "Resto", "Recorrido"],
  },
  en: {
    ciudad: "Buenos Aires",
    ubicacionPrefix: "you are in",
    ubicacionDefault: "Finding location...",
    buscar: "Search place, district or zone…",
    tabTuristico: "Tourist",
    tabResto: "Dining",
    catTitulo: "Categories",
    categorias: [
      "Museums",
      "Parks",
      "Domes",
      "Buildings",
      "Theaters",
      "Stadiums",
      "Tourist Zones",
      "My Itinerary",
    ],
    cercaTitulo: "Near you",
    resultadosBusqueda: "Search results",
    cargando: "Finding places...",
    sinResultados: "No places found.",
    nav: ["Home", "Map", "Transit", "Dining", "Itinerary"],
  },
};

const getVisualConfig = (categoria: string, isResto: boolean) => {
  if (isResto) return { icon: "restaurant", color: "#C9542A" };
  switch (categoria) {
    case "Museos":
      return { icon: "color-palette", color: "#C9542A" };
    case "Parques":
      return { icon: "leaf", color: "#3F6B4F" };
    case "Edificios historicos":
      return { icon: "business", color: "#1F4778" };
    case "Teatros":
      return { icon: "ticket", color: "#7C5FA8" };
    case "Cupulas":
      return { icon: "business-outline", color: "#E0A23A" };
    case "Canchas de futbol":
      return { icon: "football", color: "#3F6B4F" };
    case "Zonas turisticas":
      return { icon: "map", color: "#E0A23A" };
    default:
      return { icon: "location", color: "#5B6270" };
  }
};

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

export default function InicioScreen() {
  const theme = useAppTheme();
  const { lang } = useLang();
  const t = traducciones[lang];
  const router = useRouter();
  const { location, placeName } = useLocation();
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [lugaresBd, setLugaresBd] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const catIcons = [
    "color-palette-outline",
    "leaf-outline",
    "business-outline",
    "business",
    "ticket-outline",
    "football-outline",
    "map-outline",
    "trail-sign-outline",
  ];

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("puntos_interes")
          .select("id, nombre, categoria, lat, lng");
        if (error) throw error;
        setLugaresBd(data || []);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

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
      const query = searchQuery.toLowerCase();
      // Ordenamos alfabéticamente los resultados
      return listaConDistancia
        .filter((l) => l.nombre.toLowerCase().includes(query))
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
    if (index === 7) {
      router.push("/recorrido" as any);
      return;
    }

    const dbCat = DB_CATEGORIAS[index];
    setCategoriaFiltro((prev) => (prev === dbCat ? null : dbCat));
    setSearchQuery(""); // Limpiamos la búsqueda si toca una categoría
    Keyboard.dismiss();
  };

  // Determinar dinámicamente el título de la sección inferior
  const getTituloSeccion = () => {
    if (searchQuery.trim().length > 0) return t.resultadosBusqueda;
    if (categoriaFiltro)
      return t.categorias[DB_CATEGORIAS.indexOf(categoriaFiltro)];
    return t.cercaTitulo;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}
      >
        <View>
          <Text style={styles.chapaTitle}>{t.ciudad}</Text>
          <Text style={styles.chapaSub}>
            <Ionicons name="location-sharp" size={12} color="#C7D2E3" />
            {placeName
              ? ` ${t.ubicacionPrefix} ${placeName}`
              : ` ${t.ubicacionDefault}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="globe-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

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
            placeholder={t.buscar}
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

        <Text style={styles.sectionLabel}>{t.catTitulo}</Text>
        <View style={styles.catGrid}>
          {t.categorias.map((cat, index) => {
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
                activeOpacity={0.7}
                onPress={() => handleCategoriaPress(index)}
              >
                <Ionicons
                  name={catIcons[index] as any}
                  size={22}
                  color={isFiltroActivo ? theme.colors.primary : "#1F4778"}
                />
                <Text
                  style={[
                    styles.catTileText,
                    isFiltroActivo && { color: theme.colors.primary },
                  ]}
                  numberOfLines={2}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cabecera dinámica de la sección de resultados */}
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
            <Text style={styles.loadingText}>{t.cargando}</Text>
          </View>
        ) : lugaresMostrados.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t.sinResultados}</Text>
          </View>
        ) : (
          <View style={styles.verticalGrid}>
            {lugaresMostrados.map((lugar) => {
              const tipo = lugar.categoria;
              const config = getVisualConfig(tipo, false);

              return (
                <TouchableOpacity
                  key={lugar.id}
                  style={styles.poiCardGrid}
                  activeOpacity={0.9}
                  onPress={() => {
                    router.push({
                      pathname: "/detalle",
                      params: { id: lugar.id },
                    });
                  }}
                >
                  <View
                    style={[styles.poiThumb, { backgroundColor: config.color }]}
                  >
                    <Ionicons
                      name={config.icon as any}
                      size={28}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.poiBody}>
                    <Text style={styles.poiName} numberOfLines={1}>
                      {lugar.nombre}
                    </Text>
                    <Text style={styles.poiType} numberOfLines={1}>
                      {String(tipo).toUpperCase()}
                    </Text>
                    <View style={styles.distPill}>
                      <Text style={styles.distText}>
                        {location ? formatDistancia(lugar.dist) : "GPS off"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

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
  verticalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 4,
  },
  poiCardGrid: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#D9D2BC",
    overflow: "hidden",
  },
  poiThumb: { height: 74, justifyContent: "center", alignItems: "center" },
  poiBody: { padding: 8 },
  poiName: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: "#1B2330",
    marginBottom: 2,
  },
  poiType: { fontSize: 9.5, color: "#8B8F7E", fontFamily: "monospace" },
  distPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EFEADD",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 5,
    marginTop: 5,
  },
  distText: {
    color: "#1F4778",
    fontSize: 9,
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
