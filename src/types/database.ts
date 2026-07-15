export interface Lugar {
  id: string;
  nombre: string;
  categoria: string;
  comuna: number;
  lat: number;
  lng: number;
  direccion?: string;
  barrio?: string;
  descripcion_es?: string;
  descripcion_en?: string;
  historia_es?: string;
  historia_en?: string;
  foto_actual_url?: string;
  foto_antigua_url?: string;
  audioguia_es_url?: string;
  audioguia_en_url?: string;
  curiosidades_es?: string;
  curiosidades_en?: string;
  horarios_es?: string;
  horarios_en?: string;
}

export interface Restaurante {
  id: string;
  nombre: string;
  reconocimiento: string;
  comuna: number;
  direccion: string;
  resena_especial_es?: string;
  resena_especial_en?: string;
  lat: number;
  lng: number;
  foto_url?: string;
}

export interface Alojamiento {
  id: string;
  nombre: string;
  tipo_es: string;
  tipo_en: string;
  barrio: string;
  comuna: number;
  direccion: string;
  precio: string;
  estrellas?: number;
  lat: number;
  lng: number;
  descripcion_es: string;
  descripcion_en: string;
  telefono: string;
  sitio_web: string;
}
