import { MD3LightTheme as DefaultTheme, useTheme } from "react-native-paper";

export const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#0A398A", // azul-buenos-aires
    secondary: "#C9542A", // terracota
    tertiary: "#E0A23A", // mostaza
    background: "#EDF4FC", // celeste-buenos-aires-pastel
    surface: "#FFFFFF", // blanco card
    text: "#1B2330", // tinta
    textSecondary: "#5B6270", // tinta-soft
    success: "#3F6B4F", // verde-parque
    border: "#C7D8EB", // linea-celeste-borde
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
      case "Zonas turisticas": return "Tourist Zone";
      case "Deportes": return "Sports";
      case "Restaurantes": return "Restaurant";
      default: return categoria;
    }
  } else if (lang === "pt") {
    switch (categoria) {
      case "Museos": return "Museu";
      case "Parques": return "Parque";
      case "Cupulas": return "Cúpula";
      case "Edificios historicos": return "Edifício Histórico";
      case "Teatros": return "Teatro";
      case "Zonas turisticas": return "Zona Turística";
      case "Deportes": return "Esportes";
      case "Restaurantes": return "Restaurante";
      default: return categoria;
    }
  } else {
    switch (categoria) {
      case "Cupulas": return "Cúpula";
      case "Edificios historicos": return "Edificio Histórico";
      case "Zonas turisticas": return "Zona Turística";
      case "Deportes": return "Deportes";
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
    case "Zonas turisticas":
      return "#E0A23A";
    case "Cupulas":
      return "#11afa5ff";
    case "Deportes":
      // Ojo con este color: los pines nativos de Android (Marker
      // `pinColor`) solo usan el matiz (hue) en HSV, no el RGB completo, así
      // que dos colores "distintos" a la vista pueden pintar el mismo pin si
      // su matiz queda cerca. Ya pasó dos veces: #3E7CB1 (~207°) casi
      // idéntico al ~213° de "Edificios historicos", y después #B33A6B
      // (~336°) demasiado cerca del ~16° de "Museos" (la zona roja/magenta
      // se lee parecida en el pin aunque el hex sea distinto). Este verde
      // lima queda en ~90°, en el hueco más grande y lejano de matiz entre
      // todas las demás categorías (52° de Parques y de Zonas turísticas,
      // mucho más de los demás).
      return "#86BF4C";
    case "Restaurantes":
      return "#C9542A";
    default:
      return "#5B6270";
  }
};

// Paleta para distinguir, en el mapa, las rutas de cada día de un itinerario
// IA (una polyline y sus marcadores por día, todos del mismo color) — se
// repite en ciclo si hubiera más de 7 días, aunque el stepper de días hoy
// tope en 7.
const DAY_COLORS = [
  "#C9542A", // terracota
  "#0A398A", // azul-buenos-aires
  "#3F6B4F", // verde-parque
  "#7C5FA8", // violeta
  "#E0A23A", // mostaza
  "#11A5A0", // teal
  "#A83232", // rojo ladrillo
];

export const getDayColor = (day: number) => DAY_COLORS[(day - 1) % DAY_COLORS.length];

// Color neutro para lugares guardados a mano (sin día asignado) cuando
// conviven con rutas de itinerario IA en el mapa.
export const OTROS_LUGARES_COLOR = "#5B6270";

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
    case "Zonas turisticas":
      return "map";
    case "Cupulas":
      return "business-outline";
    case "Deportes":
      return "trophy";
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
    case "Zonas turisticas":
      return { bg: "#FFF8E1", text: "#D48D00", border: "#FFE082" };
    case "Cupulas":
      return { bg: "#E0F2F1", text: "#11afa5", border: "#B2DFDB" };
    case "Deportes":
      return { bg: "#F0F7E2", text: "#5B8C2A", border: "#CBE3A0" };
    case "Restaurantes":
      return { bg: "#FCE8E6", text: "#C9542A", border: "#F5B4AD" };
    default:
      return { bg: "#F5F5F5", text: "#5B6270", border: "#E0E0E0" };
  }
};
