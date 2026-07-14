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

export const getCategoryLabel = (categoria: string, lang: string) => {
  if (lang === "en") {
    switch (categoria) {
      case "Museos": return "Museum";
      case "Parques": return "Park";
      case "Cupulas": return "Dome";
      case "Edificios historicos": return "Historic Building";
      case "Teatros": return "Theater";
      case "Canchas de futbol": return "Stadium";
      case "Zonas turisticas": return "Tourist Zone";
      case "Restaurantes": return "Restaurant";
      default: return categoria;
    }
  } else {
    switch (categoria) {
      case "Canchas de futbol": return "Estadio";
      case "Cupulas": return "Cúpula";
      case "Edificios historicos": return "Edificio Histórico";
      case "Zonas turisticas": return "Zona Turística";
      case "Restaurantes": return "Restaurante";
      default: return categoria;
    }
  }
};

export const getCategoryColor = (categoria: string) => {
  switch (categoria) {
    case "Museos":
      return "#C9542A";
    case "Parques":
      return "#3F6B4F";
    case "Edificios historicos":
      return "#1F4778";
    case "Teatros":
      return "#7C5FA8";
    case "Canchas de futbol":
      return "#71ad5eff";
    case "Zonas turisticas":
      return "#E0A23A";
    case "Cupulas":
      return "#11afa5ff";
    case "Restaurantes":
      return "#C9542A";
    default:
      return "#5B6270";
  }
};

export const getCategoryIcon = (categoria: string) => {
  switch (categoria) {
    case "Museos":
      return "color-palette";
    case "Parques":
      return "leaf";
    case "Edificios historicos":
      return "business";
    case "Teatros":
      return "ticket";
    case "Canchas de futbol":
      return "football";
    case "Zonas turisticas":
      return "map";
    case "Cupulas":
      return "business-outline";
    case "Restaurantes":
      return "restaurant";
    default:
      return "location";
  }
};

export const getCategoryBadgeColors = (categoria: string) => {
  switch (categoria) {
    case "Museos":
      return { bg: "#FCE8E6", text: "#C9542A", border: "#F5B4AD" };
    case "Parques":
      return { bg: "#E6F4EA", text: "#3F6B4F", border: "#A3D8B6" };
    case "Edificios historicos":
      return { bg: "#E8F0FE", text: "#1F4778", border: "#C6DAFC" };
    case "Teatros":
      return { bg: "#F3E8FD", text: "#7C5FA8", border: "#E1BEE7" };
    case "Canchas de futbol":
      return { bg: "#E8F5E9", text: "#71ad5e", border: "#C8E6C9" };
    case "Zonas turisticas":
      return { bg: "#FFF8E1", text: "#D48D00", border: "#FFE082" };
    case "Cupulas":
      return { bg: "#E0F2F1", text: "#11afa5", border: "#B2DFDB" };
    case "Restaurantes":
      return { bg: "#FCE8E6", text: "#C9542A", border: "#F5B4AD" };
    default:
      return { bg: "#F5F5F5", text: "#5B6270", border: "#E0E0E0" };
  }
};
