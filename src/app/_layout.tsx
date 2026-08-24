import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ItineraryProvider } from "../context/ItineraryContext";
import { LangProvider } from "../context/LangContext";
import { LocationProvider } from "../context/LocationContext";
import { appTheme } from "../theme/colors";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LangProvider>
        <LocationProvider>
          <ItineraryProvider>
            <PaperProvider theme={appTheme}>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="inicio" />
                <Stack.Screen name="mapa" />
                <Stack.Screen name="alojamientos" />
                <Stack.Screen name="restaurantes" />
                <Stack.Screen name="detalle-resto" />
                <Stack.Screen name="recorrido" />
                <Stack.Screen name="detalle" />
              </Stack>
            </PaperProvider>
          </ItineraryProvider>
        </LocationProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}
