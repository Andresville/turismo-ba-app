import { Stack } from "expo-router";
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
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="inicio" />
                <Stack.Screen name="mapa" />
                <Stack.Screen name="transporte" />
                <Stack.Screen name="detalle" />
              </Stack>
            </PaperProvider>
          </ItineraryProvider>
        </LocationProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}
