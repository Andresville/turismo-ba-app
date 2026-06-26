import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

interface ItineraryContextProps {
  savedItems: string[]; // Guardaremos los IDs de los lugares
  toggleItem: (id: string) => void;
  isSaved: (id: string) => boolean;
}

const ItineraryContext = createContext<ItineraryContextProps>({
  savedItems: [],
  toggleItem: () => {},
  isSaved: () => false,
});

export const ItineraryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [savedItems, setSavedItems] = useState<string[]>([]);

  // Al cargar la app, recuperamos los lugares guardados previamente
  useEffect(() => {
    AsyncStorage.getItem("@itinerary").then((data) => {
      if (data) setSavedItems(JSON.parse(data));
    });
  }, []);

  // Función para agregar o quitar un lugar de la lista
  const toggleItem = async (id: string) => {
    let newList = [...savedItems];
    if (newList.includes(id)) {
      newList = newList.filter((item) => item !== id); // Lo quita si ya estaba
    } else {
      newList.push(id); // Lo agrega si no estaba
    }
    setSavedItems(newList);
    await AsyncStorage.setItem("@itinerary", JSON.stringify(newList));
  };

  const isSaved = (id: string) => savedItems.includes(id);

  return (
    <ItineraryContext.Provider value={{ savedItems, toggleItem, isSaved }}>
      {children}
    </ItineraryContext.Provider>
  );
};

export const useItinerary = () => useContext(ItineraryContext);
