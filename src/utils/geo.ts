export const getDistanceSquared = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  return dLat * dLat + dLon * dLon;
};

// Ordena una lista de lugares con lat/lng por vecino más cercano, empezando
// desde (startLat, startLng), para armar un recorrido a pie sin zigzaguear.
export const ordenarPorCercania = <T extends { lat: number; lng: number }>(
  puntos: T[],
  startLat: number,
  startLng: number
): T[] => {
  const result: T[] = [];
  const pool = [...puntos];
  let currentLat = startLat;
  let currentLng = startLng;

  while (pool.length > 0) {
    let bestIndex = 0;
    let bestDist = getDistanceSquared(currentLat, currentLng, pool[0].lat, pool[0].lng);

    for (let i = 1; i < pool.length; i++) {
      const dist = getDistanceSquared(currentLat, currentLng, pool[i].lat, pool[i].lng);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    const nextPlace = pool.splice(bestIndex, 1)[0];
    result.push(nextPlace);
    currentLat = nextPlace.lat;
    currentLng = nextPlace.lng;
  }

  return result;
};
