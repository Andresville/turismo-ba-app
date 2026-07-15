import AsyncStorage from "@react-native-async-storage/async-storage";

export const OFFLINE_KEYS = {
  PUNTOS_INTERES: "@cache_puntos_interes",
  RESTAURANTES: "@cache_restaurantes",
  ALOJAMIENTOS: "@cache_alojamientos",
};

export const offlineCache = {
  /**
   * Intenta descargar datos frescos de la red. Si tiene éxito, los guarda en el
   * almacenamiento local de forma persistente. Si falla por falta de internet o error de red,
   * recupera la copia de respaldo local cacheada (si existe) y retorna la bandera isOffline = true.
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<{ data: T; isOffline: boolean }> {
    try {
      // 1. Intentamos obtener datos desde la red
      const data = await fetchFn();
      // 2. Si tiene éxito, actualizamos la caché local en background
      await AsyncStorage.setItem(key, JSON.stringify(data));
      return { data, isOffline: false };
    } catch (error) {
      console.warn(`[Offline Cache] Falló la red para la clave ${key}, cargando datos locales:`, error);
      // 3. Fallback a caché local en caso de error de red
      const cached = await AsyncStorage.getItem(key);
      if (cached !== null) {
        try {
          return { data: JSON.parse(cached) as T, isOffline: true };
        } catch (parseError) {
          console.error(`[Offline Cache] Error al deserializar caché para ${key}:`, parseError);
        }
      }
      // Si no hay caché disponible y la red falló, arrojamos el error original para que la UI lo maneje
      throw error;
    }
  },

  async set(key: string, data: any): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  },

  async clear(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
};
