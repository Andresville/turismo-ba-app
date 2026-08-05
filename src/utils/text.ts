const ACENTOS: Record<string, string> = {
  á: "a", à: "a", ã: "a", â: "a", ä: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", õ: "o", ô: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ñ: "n", ç: "c",
};

// Normaliza texto para comparar ignorando acentos y mayúsculas/minúsculas,
// así "Huracan" encuentra "Huracán", "cordoba" encuentra "Córdoba", etc.
export const normalizeForSearch = (text: string): string => {
  let result = "";
  for (const char of text.toLowerCase()) {
    result += ACENTOS[char] ?? char;
  }
  return result;
};
