import { fechaLocalISO } from "../utils/fechas"

export const catalogoProductosBase = [
  { categoria: "Dotación", nombre: "MSL Bata azul oscura dama calidad", tipo: "Bata", unidad: "Unidad", variantes: ["XS", "S", "M", "L", "XL"] },
  { categoria: "Dotación", nombre: "MSL Bata verde oscura dama calidad", tipo: "Bata", unidad: "Unidad", variantes: ["XS", "S", "M", "L", "XL"] },
  { categoria: "Dotación", nombre: "MSL Bata azul oscura hombre calidad", tipo: "Bata", unidad: "Unidad", variantes: ["S", "M", "L", "XL", "XXL"] },
  { categoria: "Dotación", nombre: "MSL Bata azul oscura dama admon", tipo: "Bata", unidad: "Unidad", variantes: ["XS", "S", "M", "L", "XL"] },
  { categoria: "Dotación", nombre: "MSL Bata azul oscura hombre admon", tipo: "Bata", unidad: "Unidad", variantes: ["S", "M", "L", "XL", "XXL"] },
  { categoria: "Dotación", nombre: "MSL Operario azul dama uniforme", tipo: "Uniforme", unidad: "Unidad", variantes: ["XS", "S", "M", "L", "XL"] },
  { categoria: "Dotación", nombre: "MSL Operario azul hombre uniforme", tipo: "Uniforme", unidad: "Unidad", variantes: ["S", "M", "L", "XL", "XXL"] },
  { categoria: "Dotación", nombre: "MSL Camisa azul clara dama p. venta", tipo: "Camisa", unidad: "Unidad", variantes: ["XS", "S", "M", "L", "XL"] },
  { categoria: "Dotación", nombre: "MSL Camisa blanca dama p. venta", tipo: "Camisa", unidad: "Unidad", variantes: ["XS", "S", "M", "L", "XL"] },
  { categoria: "Dotación", nombre: "MSL Pantalon azul dama p. venta", tipo: "Pantalon", unidad: "Unidad", variantes: ["6", "8", "10", "12", "14", "16"] },
  { categoria: "Dotación", nombre: "MSL Pantalon beige dama p. venta", tipo: "Pantalon", unidad: "Unidad", variantes: ["6", "8", "10", "12", "14", "16"] },
  { categoria: "Dotación", nombre: "MSL Camisa jean hombre mtto", tipo: "Camisa", unidad: "Unidad", variantes: ["S", "M", "L", "XL", "XXL"] },
  { categoria: "Dotación", nombre: "MSL Camisa polo dama", tipo: "Camisa", unidad: "Unidad", variantes: ["XS", "S", "M", "L", "XL"] },
  { categoria: "Dotación", nombre: "MSL Camisa polo hombre", tipo: "Camisa", unidad: "Unidad", variantes: ["S", "M", "L", "XL", "XXL"] },
  { categoria: "Dotación", nombre: "MSL Jean hombre", tipo: "Jean", unidad: "Unidad", variantes: ["28", "30", "32", "34", "36", "38", "40"] },
  { categoria: "Dotación", nombre: "MSL Jean mujer", tipo: "Jean", unidad: "Unidad", variantes: ["6", "8", "10", "12", "14", "16"] },
  { categoria: "Dotación", nombre: "MSL Cofia unisex", tipo: "Cofia", unidad: "Unidad", variantes: ["unica"] },
  { categoria: "Dotación", nombre: "Chaleco Home Center", tipo: "Chaleco", unidad: "Unidad", variantes: ["S", "M", "L", "XL"] },
  { categoria: "Dotación", nombre: "Bota de seguridad", tipo: "Calzado", unidad: "Par", variantes: ["35", "36", "37", "38", "39", "40", "41", "42", "43"] },
  { categoria: "Dotación", nombre: "Bono Sodexo", tipo: "Bono", unidad: "Bono", variantes: ["unica"] },
  { categoria: "EPP", nombre: "Guantes de nitrilo", tipo: "Proteccion manos", unidad: "Caja", variantes: ["S", "M", "L"] },
  { categoria: "EPP", nombre: "Casco", tipo: "Proteccion cabeza", unidad: "Unidad", variantes: ["Blanco", "Azul", "Amarillo"] },
  { categoria: "EPP", nombre: "Gafas de seguridad", tipo: "Proteccion visual", unidad: "Unidad", variantes: ["Claras", "Oscuras"] },
  { categoria: "EPP", nombre: "Tapabocas quirurgico", tipo: "Proteccion respiratoria", unidad: "Caja", variantes: ["unica"] },
  { categoria: "EPP", nombre: "Tapabocas N95", tipo: "Proteccion respiratoria", unidad: "Unidad", variantes: ["unica"] },
  { categoria: "EPP", nombre: "Careta", tipo: "Proteccion facial", unidad: "Unidad", variantes: ["unica"] },
  { categoria: "EPP", nombre: "Equipo de alturas", tipo: "Trabajo en alturas", unidad: "Unidad", variantes: ["Arnes", "Eslinga", "Linea de vida"] },
  { categoria: "EPP", nombre: "Tapa oidos", tipo: "Proteccion auditiva", unidad: "Par", variantes: ["Insercion", "Copa"] },
  { categoria: "EPP", nombre: "Bata desechable", tipo: "Proteccion corporal", unidad: "Unidad", variantes: ["unica"] },
  { categoria: "EPP", nombre: "Cofia desechable", tipo: "Proteccion cabeza", unidad: "Paquete", variantes: ["unica"] },
]

export const productosIniciales = [
  {
    id: 1,
    nombre: "Bota de seguridad",
    categoria: "Dotación",
    tipo: "Calzado",
    variante: "38",
    unidad: "Par",
    stockActual: 12,
    stockMinimo: 4,
    ubicacion: "Bodega GH",
    estado: "Activo",
  },
  {
    id: 2,
    nombre: "Guantes de nitrilo",
    categoria: "EPP",
    tipo: "Proteccion manos",
    variante: "M",
    unidad: "Caja",
    stockActual: 3,
    stockMinimo: 5,
    ubicacion: "Bodega GH",
    estado: "Activo",
  },
]

export const formularioVacio = {
  nombre: "",
  categoria: "Dotación",
  tipo: "",
  variante: "",
  unidad: "Unidad",
  stockActual: "",
  stockMinimo: "",
  motivoEntrada: "Compra",
  observacionEntrada: "",
  ubicacion: "Bodega GH",
  estado: "Activo",
}

export const itemCatalogoVacio = {
  categoria: "Dotación",
  nombre: "",
  tipo: "",
  unidad: "Unidad",
  variantes: "",
  stockMinimo: "",
}

export function crearMovimientoVacio() {
  return {
    productoId: "",
    tipoMovimiento: "Entrada",
    cantidad: "",
    fecha: fechaLocalISO(),
    observacion: "",
  }
}

export const movimientoVacio = crearMovimientoVacio()

export function crearEntregaVacia() {
  return {
    colaboradorId: "",
    fecha: fechaLocalISO(),
    motivo: "Ingreso",
    responsable: "",
    observacion: "",
  }
}

export const entregaVacia = crearEntregaVacia()

export const lineaEntregaVacia = {
  productoId: "",
  cantidad: "",
}

export const colaboradorVacio = {
  identificacion: "",
  nombreCompleto: "",
  cargo: "",
  subArea: "",
  grupo: "",
  centroCostos: "",
  nombreCentroCostos: "",
  sexo: "Femenino",
  estado: "Activo",
  tallaAntifluido: "N/A",
  tallaBata: "N/A",
  tallaCamisa: "N/A",
  tallaPantalon: "N/A",
  tallaBotas: "",
}

export const gruposDisponibles = ["51", "52", "72", "73"]

export const subAreasDisponibles = [
  "Gestion Humana",
  "Produccion",
  "Despachos",
  "Comercial",
  "Fabricacion Ambientadores",
  "Acond. Ambientadores",
  "Produccion  Solidos Y Semisolidos",
  "Produccion  Autos",
  "Financiera",
  "Mantenimiento",
  "Hse",
  "Calidad",
  "Abastecimiento",
  "Sena",
  "Ejercito Industrial",
  "Compras",
]

export const centrosCostos = [
  { codigo: "750102", nombre: "Generales Gestion Humana" },
  { codigo: "730501", nombre: "Generales Produccion" },
  { codigo: "740201", nombre: "Distribucion Comercial" },
  { codigo: "720101", nombre: "Generales Comercial" },
  { codigo: "730100", nombre: "Recolector Planta Ambientadores" },
  { codigo: "730301", nombre: "Recolector Solidos" },
  { codigo: "730201", nombre: "Recolector Planta Autos" },
  { codigo: "710201", nombre: "Generales Administracion" },
  { codigo: "730403", nombre: "Mtto Msl" },
  { codigo: "750301", nombre: "Gestion Ambiental" },
  { codigo: "730402", nombre: "Laboratorio Msl" },
  { codigo: "730701", nombre: "Generales Calidad" },
]
