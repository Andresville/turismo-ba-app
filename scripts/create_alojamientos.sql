-- ==========================================
-- SCRIPT DE CREACIÓN DE TABLA DE ALOJAMIENTOS
-- Ejecutar en el Editor SQL de Supabase
-- ==========================================

-- 1. Crear la tabla de alojamientos
CREATE TABLE IF NOT EXISTS alojamientos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo_es TEXT NOT NULL,
  tipo_en TEXT NOT NULL,
  barrio TEXT NOT NULL,
  comuna INTEGER NOT NULL,
  direccion TEXT NOT NULL,
  precio TEXT NOT NULL,
  estrellas INTEGER,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  descripcion_es TEXT NOT NULL,
  descripcion_en TEXT NOT NULL,
  telefono TEXT NOT NULL,
  sitio_web TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar la seguridad a nivel de filas (RLS)
ALTER TABLE alojamientos ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para permitir la lectura pública
CREATE POLICY "Permitir lectura publica de alojamientos"
ON alojamientos FOR SELECT
TO anon
USING (true);

-- 4. Insertar los datos de alojamientos recomendados
INSERT INTO alojamientos (id, nombre, tipo_es, tipo_en, barrio, comuna, direccion, precio, estrellas, lat, lng, descripcion_es, descripcion_en, telefono, sitio_web)
VALUES
  (
    'a1-alvear-palace', 
    'Alvear Palace Hotel', 
    'Hotel de Lujo (5 Estrellas)', 
    'Luxury Hotel (5 Stars)', 
    'Recoleta', 
    2, 
    'Av. Alvear 1891', 
    '$$$$', 
    5, 
    -34.5878, 
    -58.3892, 
    'Uno de los hoteles más lujosos del mundo, famoso por su arquitectura clásica de estilo francés, servicio de mayordomía impecable y té de la tarde tradicional.', 
    'One of the most luxurious hotels in the world, famous for its classic French-style architecture, impeccable butler service, and traditional afternoon tea.', 
    '+54 11 4808-2100', 
    'https://www.alvearpalace.com'
  ),
  (
    'a2-faena-hotel', 
    'Faena Hotel Buenos Aires', 
    'Hotel Boutique de Diseño', 
    'Boutique Design Hotel', 
    'Puerto Madero', 
    1, 
    'Martha Salotti 445', 
    '$$$$', 
    5, 
    -34.6121, 
    -58.3619, 
    'Ubicado en un antiguo silo de grano rediseñado por Philippe Starck. Ofrece una experiencia teatral única, decoración extravagante en rojo y dorado, y un cabaret espectacular.', 
    'Located in a historic grain silo redesigned by Philippe Starck. It offers a unique theatrical experience, extravagant red and gold decor, and a spectacular cabaret.', 
    '+54 11 4010-9000', 
    'https://www.faena.com'
  ),
  (
    'a3-four-seasons', 
    'Four Seasons Hotel Buenos Aires', 
    'Hotel de Lujo', 
    'Luxury Hotel', 
    'Retiro', 
    2, 
    'Posadas 1086', 
    '$$$$', 
    5, 
    -34.5908, 
    -58.3814, 
    'Combina una torre contemporánea con una mansión de estilo francés de principios del siglo XX. Cuenta con piscina al aire libre climatizada en el barrio de Recoleta y la parrilla gourmet Elena.', 
    'Combines a contemporary tower with an early 20th-century French mansion. Features a heated outdoor pool in Recoleta and the award-winning gourmet restaurant Elena.', 
    '+54 11 4321-1200', 
    'https://www.fourseasons.com/buenosaires'
  ),
  (
    'a4-legado-mitico', 
    'Legado Mítico Buenos Aires', 
    'Hotel Boutique Temático', 
    'Themed Boutique Hotel', 
    'Palermo Soho', 
    14, 
    'Gurruchaga 1848', 
    '$$$', 
    4, 
    -34.5875, 
    -58.4285, 
    'Un hotel boutique íntimo donde cada habitación homenajea a una figura legendaria de la historia y cultura argentina, como Evita, San Martín o Carlos Gardel.', 
    'An intimate boutique hotel where each room pays tribute to a legendary figure of Argentine history and culture, such as Evita, San Martin, or Carlos Gardel.', 
    '+54 11 4833-1300', 
    'https://www.legadomitico.com'
  ),
  (
    'a5-selina-palermo', 
    'Selina Palermo', 
    'Hostel / Espacio de Coworking', 
    'Hostel & Coworking Space', 
    'Palermo', 
    14, 
    'Guatemala 4931', 
    '$$', 
    NULL, 
    -34.5843, 
    -58.4258, 
    'Ideal para nómadas digitales y viajeros jóvenes. Cuenta con habitaciones privadas y compartidas, un bar en la terraza con eventos en vivo, y un ambiente social muy activo.', 
    'Ideal for digital nomads and young travelers. Features private and shared rooms, a rooftop bar with live events, and a highly social atmosphere.', 
    '+54 11 4776-2354', 
    'https://www.selina.com'
  ),
  (
    'a6-milhouse-hostel', 
    'Milhouse Hostel Hipo', 
    'Hostel Juvenil / Backpackers', 
    'Youth Hostel / Backpackers', 
    'Monserrat (Centro)', 
    1, 
    'Hipólito Yrigoyen 1107', 
    '$', 
    NULL, 
    -34.6091, 
    -58.3810, 
    'Un hostel de jóvenes famoso ubicado en una casona del siglo XIX restaurada en el centro. Conocido por su ambiente festivo, actividades diarias gratuitas y tours de fútbol y tango.', 
    'A famous hostel located in a restored 19th-century mansion downtown. Renowned for its party atmosphere, free daily activities, and football or tango tours.', 
    '+54 11 4383-5030', 
    'https://www.milhousehostel.com'
  );
