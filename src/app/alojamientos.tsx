import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  LayoutAnimation,
  View,
} from "react-native";
import { Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNavBar from "../components/BottomNavBar";
import { useLang } from "../context/LangContext";
import { supabase } from "../lib/supabase";
import { useAppTheme } from "../theme/colors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface Alojamiento {
  id: string;
  nombre: string;
  tipo_es: string;
  tipo_en: string;
  barrio: string;
  comuna: number;
  direccion: string;
  precio: string;
  estrellas?: number;
  lat: number;
  lng: number;
  descripcion_es: string;
  descripcion_en: string;
  telefono: string;
  sitio_web: string;
}

const traducciones = {
  es: {
    titulo: "Alojamientos",
    subtitulo: "Hoteles y hospedajes recomendados",
    filtroTodos: "Todos",
    filtroLujo: "Lujo",
    filtroBoutique: "Boutique",
    filtroHostel: "Hostel",
    comoLlegar: "Cómo llegar",
    llamar: "Llamar",
    sitioWeb: "Sitio Web",
    estrellas: "estrellas",
    precio: "Precio:",
    cargando: "Buscando alojamientos...",
  },
  en: {
    titulo: "Lodgings",
    subtitulo: "Recommended hotels and accommodations",
    filtroTodos: "All",
    filtroLujo: "Luxury",
    filtroBoutique: "Boutique",
    filtroHostel: "Hostel",
    comoLlegar: "Directions",
    llamar: "Call",
    sitioWeb: "Website",
    estrellas: "stars",
    precio: "Price:",
    cargando: "Finding lodgings...",
  },
};

export default function AlojamientosScreen() {
  const theme = useAppTheme();
  const { lang } = useLang();
  const t = traducciones[lang as keyof typeof traducciones] || traducciones.es;
  const router = useRouter();

  const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "lujo" | "boutique" | "hostel">("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlojamientos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("alojamientos")
          .select("*");
        if (error) throw error;
        setAlojamientos((data as Alojamiento[]) || []);
      } catch (error) {
        console.error("Error al cargar alojamientos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlojamientos();
  }, []);

  const handleWebPress = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error("Error al abrir navegador web:", error);
      Linking.openURL(url);
    }
  };

  const handleCallPress = (telefono: string, nombre: string) => {
    Alert.alert(
      lang === "es" ? "Confirmar llamada" : "Confirm Call",
      lang === "es"
        ? `¿Querés llamar a ${nombre} al número ${telefono}?`
        : `Do you want to call ${nombre} at ${telefono}?`,
      [
        { text: lang === "es" ? "Cancelar" : "Cancel", style: "cancel" },
        {
          text: lang === "es" ? "Llamar" : "Call",
          onPress: () => {
            const numClean = telefono.replace(/[\s-]/g, "");
            Linking.openURL(`tel:${numClean}`);
          },
        },
      ]
    );
  };

  const handleMapPress = (item: Alojamiento) => {
    router.push({
      pathname: "/mapa",
      params: {
        destinoLat: item.lat,
        destinoLng: item.lng,
        destinoNombre: item.nombre,
      },
    });
  };

  const alojamientosFiltrados = alojamientos.filter((item) => {
    if (filtroActivo === "todos") return true;
    if (filtroActivo === "lujo") return item.tipo_en.toLowerCase().includes("luxury");
    if (filtroActivo === "boutique") return item.tipo_en.toLowerCase().includes("boutique");
    if (filtroActivo === "hostel") return item.tipo_en.toLowerCase().includes("hostel");
    return true;
  });

  const getAlojamientoIcon = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t.includes("luxury") || t.includes("lujo")) return { name: "ribbon", color: theme.colors.tertiary };
    if (t.includes("boutique")) return { name: "rose", color: theme.colors.secondary };
    return { name: "people", color: theme.colors.success };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cabecera superior tipo "Chapa" */}
      <View style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}>
        <View>
          <Text style={styles.chapaTitle}>{t.titulo}</Text>
          <Text style={styles.chapaSub}>{t.subtitulo}</Text>
        </View>
      </View>

      {/* Chips de filtro */}
      <View style={styles.filterRow}>
        {(["todos", "lujo", "boutique", "hostel"] as const).map((filtro) => {
          const isSelected = filtroActivo === filtro;
          const label =
            filtro === "todos"
              ? t.filtroTodos
              : filtro === "lujo"
              ? t.filtroLujo
              : filtro === "boutique"
              ? t.filtroBoutique
              : t.filtroHostel;

          return (
            <TouchableOpacity
              key={filtro}
              style={[
                styles.filterChip,
                { borderColor: theme.colors.border },
                isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setFiltroActivo(filtro);
                setExpandedId(null);
              }}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${label}. ${isSelected ? (lang === 'es' ? 'Seleccionado' : 'Selected') : ''}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isSelected ? "#fff" : theme.colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Scroll de Alojamientos */}
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ padding: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: theme.colors.textSecondary, fontSize: 13 }}>{t.cargando}</Text>
          </View>
        ) : (
          alojamientosFiltrados.map((item) => {
          const isExpanded = expandedId === item.id;
          const icon = getAlojamientoIcon(item.tipo_en);
          const tipo = lang === "es" ? item.tipo_es : item.tipo_en;
          const desc = lang === "es" ? item.descripcion_es : item.descripcion_en;

          return (
            <Card
              key={item.id}
              style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpandedId(isExpanded ? null : item.id);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${item.nombre}, ${tipo}, ${item.barrio}. ${isExpanded ? (lang === 'es' ? 'Toca para contraer' : 'Double tap to collapse') : (lang === 'es' ? 'Toca para expandir detalles' : 'Double tap to expand')}`}
            >
              <Card.Content style={styles.cardHeader}>
                <View style={[styles.iconWrapper, { backgroundColor: theme.colors.background }]}>
                  <Ionicons name={icon.name as any} size={24} color={icon.color} />
                </View>
                <View style={styles.headerInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.hotelName}>{item.nombre}</Text>
                    <Text style={[styles.priceText, { color: theme.colors.secondary }]}>{item.precio}</Text>
                  </View>
                  <Text style={styles.hotelType}>{tipo}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.locationText}>
                      {item.direccion} ({item.barrio})
                    </Text>
                  </View>
                  {item.estrellas && (
                    <View style={styles.starsRow}>
                      {Array.from({ length: item.estrellas }).map((_, i) => (
                        <Ionicons key={i} name="star" size={12} color="#E0A23A" />
                      ))}
                    </View>
                  )}
                </View>
              </Card.Content>

              {isExpanded && (
                <View style={[styles.expandedContent, { borderTopColor: theme.colors.border }]}>
                  <Text style={styles.description}>{desc}</Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: theme.colors.secondary }]}
                      onPress={() => handleMapPress(item)}
                      activeOpacity={0.8}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`${t.comoLlegar} a ${item.nombre}`}
                    >
                      <Ionicons name="navigate" size={14} color="#fff" />
                      <Text style={styles.btnText}>{t.comoLlegar}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnOutline, { borderColor: theme.colors.primary }]}
                      onPress={() => handleCallPress(item.telefono, item.nombre)}
                      activeOpacity={0.8}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`${t.llamar} a ${item.nombre}`}
                    >
                      <Ionicons name="call-outline" size={14} color={theme.colors.primary} />
                      <Text style={[styles.btnOutlineText, { color: theme.colors.primary }]}>{t.llamar}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnOutline, { borderColor: theme.colors.primary }]}
                      onPress={() => handleWebPress(item.sitio_web)}
                      activeOpacity={0.8}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`${t.sitioWeb} de ${item.nombre}`}
                    >
                      <Ionicons name="globe-outline" size={14} color={theme.colors.primary} />
                      <Text style={[styles.btnOutlineText, { color: theme.colors.primary }]}>{t.sitioWeb}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Card>
          );
        }))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Pie de navegación */}
      <BottomNavBar activeTab={2} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chapaBar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  chapaTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  chapaSub: {
    fontSize: 11,
    color: "#C7D2E3",
    marginTop: 2,
    fontFamily: "monospace",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: "bold",
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 0,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hotelName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1B2330",
    flex: 1,
    marginRight: 8,
  },
  priceText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  hotelType: {
    fontSize: 11,
    color: "#5A5E50",
    fontFamily: "monospace",
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: "#5B6270",
  },
  starsRow: {
    flexDirection: "row",
    marginTop: 4,
    gap: 2,
  },
  expandedContent: {
    padding: 12,
    borderTopWidth: 1,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    color: "#1B2330",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  btn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 11.5,
    fontWeight: "bold",
  },
  btnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  btnOutlineText: {
    fontSize: 11.5,
    fontWeight: "bold",
  },
});
