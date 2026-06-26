import * as Location from "expo-location";
import React, { createContext, useContext, useEffect, useState } from "react";

interface LocationContextProps {
  location: Location.LocationObject | null;
  placeName: string | null;
  errorMsg: string | null;
}

const LocationContext = createContext<LocationContextProps>({
  location: null,
  placeName: null,
  errorMsg: null,
});

export const LocationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // 1. Pedimos permiso al usuario
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permiso de ubicación denegado");
        return;
      }

      try {
        // 2. Obtenemos las coordenadas GPS
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);

        // 3. Traducimos las coordenadas a nombre de barrio/ciudad
        let geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (geocode.length > 0) {
          const place = geocode[0];
          // Tomamos el barrio, o la ciudad si el barrio no está disponible
          const barrio =
            place.district || place.subregion || place.city || "Buenos Aires";
          setPlaceName(barrio);
        }
      } catch (error) {
        setErrorMsg("Error al obtener ubicación");
      }
    })();
  }, []);

  return (
    <LocationContext.Provider value={{ location, placeName, errorMsg }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
