import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

interface ItineraryContextProps {
  savedItems: string[]; // Guardaremos los IDs de los lugares
  dayMap: Record<string, number>; // id -> día del itinerario IA que lo generó (sin entrada = guardado manual)
  toggleItem: (id: string, day?: number) => void;
  isSaved: (id: string) => boolean;
}

const ItineraryContext = createContext<ItineraryContextProps>({
  savedItems: [],
  dayMap: {},
  toggleItem: () => {},
  isSaved: () => false,
});

export const ItineraryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [savedItems, setSavedItems] = useState<string[]>([]);
  const [dayMap, setDayMap] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  const savedItemsRef = useRef<string[]>([]);

  // Al cargar la app, recuperamos los lugares guardados previamente
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("@itinerary"),
      AsyncStorage.getItem("@itinerary_days"),
    ]).then(([itemsData, daysData]) => {
      const items: string[] = itemsData ? JSON.parse(itemsData) : [];
      savedItemsRef.current = items;
      setSavedItems(items);
      if (daysData) setDayMap(JSON.parse(daysData));
      setHydrated(true);
    });
  }, []);

  // Persistimos en efectos separados (no dentro de toggleItem) para que el
  // guardado en AsyncStorage siempre parta del estado más reciente, incluso
  // cuando toggleItem se llama varias veces seguidas en el mismo tick (por
  // ejemplo al guardar un itinerario de varios días de una sola vez) — el
  // guard de `hydrated` evita pisar lo guardado con [] antes de terminar de
  // cargar.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem("@itinerary", JSON.stringify(savedItems)).catch((e) =>
      console.error("Error al guardar itinerario:", e)
    );
  }, [savedItems, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem("@itinerary_days", JSON.stringify(dayMap)).catch((e) =>
      console.error("Error al guardar días del itinerario:", e)
    );
  }, [dayMap, hydrated]);

  // Función para agregar o quitar un lugar de la lista, con un día opcional
  // (usado cuando el lugar viene de un itinerario generado por IA, para
  // poder agruparlo después en la pantalla de Recorrido). Usa un ref propio
  // para saber si el id ya estaba guardado en vez de leer `savedItems` por
  // closure: el ref se actualiza de forma síncrona, así que llamadas
  // consecutivas al guardar de una sola vez varias paradas (mismo tick) ven
  // el estado real y no una copia desactualizada.
  const toggleItem = (id: string, day?: number) => {
    const wasSaved = savedItemsRef.current.includes(id);
    savedItemsRef.current = wasSaved
      ? savedItemsRef.current.filter((item) => item !== id)
      : [...savedItemsRef.current, id];

    setSavedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );

    setDayMap((prev) => {
      if (wasSaved) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      if (day == null) return prev;
      return { ...prev, [id]: day };
    });
  };

  const isSaved = (id: string) => savedItems.includes(id);

  return (
    <ItineraryContext.Provider value={{ savedItems, dayMap, toggleItem, isSaved }}>
      {children}
    </ItineraryContext.Provider>
  );
};

export const useItinerary = () => useContext(ItineraryContext);
