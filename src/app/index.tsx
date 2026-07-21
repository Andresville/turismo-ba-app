import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "../context/LangContext";

const traducciones = {
  es: {
    titulo: "Turismo Buenos Aires",
    descripcion:
      "Descubrí Buenos Aires a tu manera: historia, arte, parques y los mejores restaurantes de la ciudad.",
    btnComenzar: "Comenzar",
  },
  en: {
    titulo: "Buenos Aires Tourism",
    descripcion:
      "Discover Buenos Aires your way: history, art, parks, and the best dining in the city.",
    btnComenzar: "Get Started",
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
          style={{ width: 80, height: 80, borderRadius: 18, marginBottom: 16 }}
        />

        <Text style={styles.title}>{t.titulo}</Text>
        <Text style={styles.tag}>{t.descripcion}</Text>

        <View style={styles.langPick}>
          <TouchableOpacity
            style={[styles.langBtn, lang === "es" && styles.langBtnActive]}
            onPress={() => setLang("es")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.langText,
                lang === "es" && { color: theme.colors.primary },
              ]}
            >
              Español
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
            onPress={() => setLang("en")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.langText,
                lang === "en" && { color: theme.colors.primary },
              ]}
            >
              English
            </Text>
          </TouchableOpacity>
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
  mark: {
    width: 62,
    height: 62,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  markText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  tag: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 24,
    marginBottom: 48,
  },
  langPick: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  langBtnActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  langText: {
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
