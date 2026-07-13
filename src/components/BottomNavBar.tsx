import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useLang } from "../context/LangContext";
import { useAppTheme } from "../theme/colors";

interface BottomNavBarProps {
  activeTab: number; // 0: Inicio, 1: Mapa, 2: Alojamientos, 3: Restaurantes, 4: Recorrido
}

const traducciones = {
  es: {
    nav: ["Inicio", "Mapa", "Alojamientos", "Resto", "Recorrido"],
  },
  en: {
    nav: ["Home", "Map", "Lodging", "Dining", "Itinerary"],
  },
};

export default function BottomNavBar({ activeTab }: BottomNavBarProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const { lang } = useLang();
  
  const t = traducciones[lang as keyof typeof traducciones] || traducciones.es;

  const navIcons = [
    "home",
    "map",
    "bed",
    "restaurant",
    "list",
  ];

  const routes = [
    "/inicio",
    "/mapa",
    "/alojamientos",
    "/restaurantes",
    "/recorrido",
  ];

  const handlePress = (index: number) => {
    if (activeTab === index) return;
    router.replace(routes[index] as any);
  };

  return (
    <View style={[styles.bottomNav, { backgroundColor: "#fff", borderColor: theme.colors.border }]}>
      {t.nav.map((item, index) => {
        const isActive = activeTab === index;
        const iconName = isActive ? navIcons[index] : `${navIcons[index]}-outline`;
        
        return (
          <TouchableOpacity
            key={index}
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => handlePress(index)}
          >
            <Ionicons
              name={iconName as any}
              size={22}
              color={isActive ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.navText,
                { color: isActive ? theme.colors.primary : theme.colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  navText: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
});
