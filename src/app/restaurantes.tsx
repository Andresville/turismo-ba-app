import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNavBar from "../components/BottomNavBar";
import { useLang } from "../context/LangContext";
import { supabase } from "../lib/supabase";
import { useAppTheme } from "../theme/colors";

const traducciones = {
  es: {
    titulo: "Restaurantes",
    subtitulo: "Gastronomía recomendada de la ciudad",
    cargando: "Buscando restaurantes...",
    sinDatos: "No hay restaurantes disponibles.",
    michelin: "Estrella Michelin",
    bodegon: "Bodegón Histórico",
    comuna: (c: number) => `Comuna ${c}`,
  },
  en: {
    titulo: "Dining",
    subtitulo: "Recommended city gastronomy",
    cargando: "Finding restaurants...",
    sinDatos: "No restaurants available.",
    michelin: "Michelin Star",
    bodegon: "Historic Tavern",
    comuna: (c: number) => `Commune ${c}`,
  },
};

// Mapeo dinámico de imágenes locales basadas en los IDs de la base de datos
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
  lat: number;
  lng: number;
  foto_url?: string;
}

export default function RestaurantesScreen() {
  const theme = useAppTheme();
  const { lang } = useLang();
  const t = traducciones[lang as keyof typeof traducciones] || traducciones.es;
  const router = useRouter();

  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurantes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("restaurantes")
          .select("id, nombre, reconocimiento, comuna, direccion, lat, lng, foto_url");
        if (error) throw error;
        setRestaurantes((data as Restaurante[]) || []);
      } catch (error) {
        console.error("Error al cargar restaurantes:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurantes();
  }, []);

  const getReconocimientoLabel = (rec: string) => {
    if (rec.toLowerCase().includes("michelin")) return t.michelin;
    if (rec.toLowerCase().includes("bodegon") || rec.toLowerCase().includes("bodegón")) return t.bodegon;
    return rec;
  };

  const getReconocimientoColors = (rec: string) => {
    if (rec.toLowerCase().includes("michelin")) {
      return { bg: "#FCE8E6", text: "#C9542A", border: "#F5B4AD" };
    }
    return { bg: "#E6F4EA", text: "#3F6B4F", border: "#A3D8B6" };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cabecera superior "Chapa" */}
      <View style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}>
        <View>
          <Text style={styles.chapaTitle}>{t.titulo}</Text>
          <Text style={styles.chapaSub}>{t.subtitulo}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t.cargando}</Text>
          </View>
        ) : restaurantes.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="restaurant-outline" size={48} color={theme.colors.border} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t.sinDatos}</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {restaurantes.map((item) => {
              const foto = item.foto_url ? { uri: item.foto_url } : FOTOS_RESTAURANTES[item.id];
              const recColors = getReconocimientoColors(item.reconocimiento);
              const recLabel = getReconocimientoLabel(item.reconocimiento);

              return (
                <Card
                  key={item.id}
                  style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => {
                    router.push({
                      pathname: "/detalle-resto" as any,
                      params: { id: item.id },
                    });
                  }}
                >
                  <View style={styles.photoContainer}>
                    {foto ? (
                      <Image source={foto} style={styles.cardImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.placeholderPhoto, { backgroundColor: theme.colors.background }]}>
                        <Ionicons name="restaurant" size={32} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <View style={[styles.badge, { backgroundColor: recColors.bg, borderColor: recColors.border }]}>
                      <Text style={[styles.badgeText, { color: recColors.text }]}>{recLabel}</Text>
                    </View>
                  </View>

                  <Card.Content style={styles.cardBody}>
                    <Text style={styles.restName}>{item.nombre}</Text>
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                      <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                        {item.direccion} · {t.comuna(item.comuna)}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Pie de navegación */}
      <BottomNavBar activeTab={3} />
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
  scrollArea: {
    flex: 1,
    paddingHorizontal: 18,
  },
  listContainer: {
    paddingTop: 16,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    elevation: 0,
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
  restName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1B2330",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  infoText: {
    fontSize: 11.5,
  },
  centerContainer: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12.5,
  },
});
