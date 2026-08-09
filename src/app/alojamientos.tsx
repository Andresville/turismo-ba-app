import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AppLogo from "../components/AppLogo";
import BottomNavBar from "../components/BottomNavBar";
import AlojamientoTab from "../components/booking/AlojamientoTab";
import VuelosTab from "../components/booking/VuelosTab";
import ItinerarioIATab from "../components/booking/ItinerarioIATab";
import { useAppTheme } from "../theme/colors";
import { useTranslation } from "../locales/i18n";

type TabKey = "alojamiento" | "vuelos" | "itinerario";

export default function AlojamientosScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("alojamiento");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cabecera superior tipo "Chapa" */}
      <View style={[styles.chapaBar, { backgroundColor: theme.colors.primary }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AppLogo />
          <View>
            <Text style={styles.chapaTitle}>{t("alojamientos.titulo")}</Text>
            <Text style={styles.chapaSub}>{t("alojamientos.subtitulo")}</Text>
          </View>
        </View>
      </View>

      {/* Selector de 3 pestañas */}
      <View style={styles.tabRow}>
        {(["alojamiento", "vuelos", "itinerario"] as const).map((key) => {
          const isSelected = tab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.tabChip,
                { borderColor: theme.colors.border },
                isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}
              onPress={() => setTab(key)}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={t(`alojamientos.tabs.${key}`)}
            >
              <Text
                style={[
                  styles.tabChipText,
                  { color: isSelected ? "#fff" : theme.colors.textSecondary },
                ]}
              >
                {t(`alojamientos.tabs.${key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === "alojamiento" && <AlojamientoTab />}
      {tab === "vuelos" && <VuelosTab />}
      {tab === "itinerario" && <ItinerarioIATab />}

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
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 8,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  tabChipText: {
    fontSize: 11.5,
    fontWeight: "bold",
  },
});
