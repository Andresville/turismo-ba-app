import { MD3LightTheme as DefaultTheme, useTheme } from "react-native-paper";

export const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#15315A", // azul-chapa
    secondary: "#C9542A", // terracota
    tertiary: "#E0A23A", // mostaza
    background: "#EFEADD", // marfil
    surface: "#FBF9F2", // marfil-card
    text: "#1B2330", // tinta
    textSecondary: "#5B6270", // tinta-soft
    success: "#3F6B4F", // verde-parque
    border: "#D9D2BC", // linea-borde
  },
};

export type AppTheme = typeof appTheme;

export const useAppTheme = () => useTheme<AppTheme>();
