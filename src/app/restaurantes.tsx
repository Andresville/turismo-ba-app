import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import AppLogo from "../components/AppLogo";
import BottomNavBar from "../components/BottomNavBar";
import { supabase } from "../lib/supabase";
import { useAppTheme } from "../theme/colors";
import { useTranslation } from "../locales/i18n";
import { Restaurante } from "../types/database";
import { offlineCache, OFFLINE_KEYS } from "../lib/offline-cache";
import { OfflineBanner, ErrorState } from "../components/connection-status";

// Mapeo dinámico de imágenes locales basadas en los IDs de la base de datos
const FOTOS_RESTAURANTES: Record<string, any> = {
  "ac1c8282-8efd-45dd-a5e1-c7a3bd58c5b0": require("../../assets/images/don-julio.png"),
  "09fec52d-54ed-472b-bcb2-3615a9d9996f": require("../../assets/images/el-obrero.png"),
};

export default function RestaurantesScreen() {
  const theme = useAppTheme();
  const { t, lang } = useTranslation();
  const router = useRouter();

  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);

  const fetchRestaurantes = async () => {
    setLoading(true);
    setErrorLoading(false);
    try {
      const { data, isOffline: offline } = await offlineCache.get<Restaurante[]>(
        OFFLINE_KEYS.RESTAURANTES,
        async () => {
          const { data: dbData, error } = await supabase
            .from("restaurantes")
            .select("*");
          if (error) throw error;
          return dbData || [];
        }
      );
      setRestaurantes(data);
      setIsOffline(offline);
    } catch (error) {
      console.error("Error al cargar restaurantes:", error);
      setErrorLoading(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurantes();
  }, []);

  const getReconocimientoLabel = (rec: string) => {
    if (rec.toLowerCase().includes("michelin")) return t("restaurantes.michelin");
    if (rec.toLowerCase().includes("bodegon") || rec.toLowerCase().includes("bodegón")) return t("restaurantes.bodegon");
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
      <OfflineBanner isOffline={isOffline} />
      {/* Cabecera superior "Chapa" */}
      <View style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AppLogo />
          <View>
            <Text style={styles.chapaTitle}>{t("restaurantes.titulo")}</Text>
            <Text style={styles.chapaSub}>{t("restaurantes.subtitulo")}</Text>
          </View>
        </View>
      </View>

      {errorLoading ? (
        <ErrorState onRetry={fetchRestaurantes} />
      ) : (
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t("restaurantes.cargando")}</Text>
            </View>
          ) : restaurantes.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="restaurant-outline" size={48} color={theme.colors.border} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t("restaurantes.sinDatos")}</Text>
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
                      <Image source={foto} style={styles.cardImage} contentFit="cover" transition={200} />
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
                        {item.direccion} · {t("restaurantes.comuna", { c: item.comuna })}
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
      )}

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
