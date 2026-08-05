import { Image } from "expo-image";
import React from "react";

// Logo chico para los encabezados ("chapa") de las pantallas principales,
// así se ve en todas y no se pierde la sensación de estar en la app.
export default function AppLogo() {
  return (
    <Image
      source={require("../../assets/images/icon.png")}
      style={{ width: 42, height: 42, borderRadius: 10 }}
    />
  );
}
