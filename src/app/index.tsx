import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "../context/LangContext";

const IDIOMAS = [
  { code: "es" as const, flag: "🇦🇷", label: "Español" },
  { code: "en" as const, flag: "🇺🇸", label: "English" },
  { code: "pt" as const, flag: "🇧🇷", label: "Português" },
];

const traducciones = {
  es: {
    descripcion: "Descubrí Buenos Aires a tu manera...",
    btnComenzar: "Comenzar",
  },
  en: {
    descripcion: "Discover Buenos Aires your way...",
    btnComenzar: "Get Started",
  },
  pt: {
    descripcion: "Descubra Buenos Aires do seu jeito...",
    btnComenzar: "Começar",
  },
};

export default function SplashScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { lang, setLang } = useLang();
  const t = traducciones[lang];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <View style={styles.splash}>
        {/* Marca / Logo */}
        <Image
          source={require("../../assets/images/icon.png")}
          style={{ width: 220, height: 220, marginBottom: 20 }}
          contentFit="contain"
        />

        <Text style={styles.title}>
          {lang === "en"
            ? "Buenos Aires\nTourism"
            : lang === "pt"
            ? "Turismo em\nBuenos Aires"
            : "Turismo\nBuenos Aires"}
        </Text>
        <Text style={styles.tag}>{t.descripcion}</Text>

        <View style={styles.langList}>
          {IDIOMAS.map((idioma) => {
            const isActive = lang === idioma.code;
            return (
              <TouchableOpacity
                key={idioma.code}
                style={[styles.langRow, isActive && styles.langRowActive]}
                onPress={() => setLang(idioma.code)}
                activeOpacity={0.8}
                accessible={true}
                accessibilityRole="radio"
                accessibilityState={{ checked: isActive }}
                accessibilityLabel={idioma.label}
              >
                <View style={styles.langRowLeft}>
                  <Text style={styles.langFlag}>{idioma.flag}</Text>
                  <Text
                    style={[
                      styles.langRowText,
                      isActive && { color: theme.colors.primary },
                    ]}
                  >
                    {idioma.label}
                  </Text>
                </View>
                <Ionicons
                  name={isActive ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={isActive ? theme.colors.primary : "rgba(255,255,255,0.35)"}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: theme.colors.secondary }]}
          onPress={() => router.push("/inicio")}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>{t.btnComenzar}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingBottom: 30,
    paddingTop: 34,
  },

  title: {
    fontSize: 38,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
    lineHeight: 46,
  },
  tag: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 24,
    marginBottom: 48,
  },
  langList: {
    width: "100%",
    gap: 10,
    marginBottom: 28,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  langRowActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  langRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  langFlag: {
    fontSize: 20,
  },
  langRowText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  cta: {
    width: "100%",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footNote: {
    fontSize: 11,
    color: "#8FA0BD",
    textAlign: "center",
  },
});
