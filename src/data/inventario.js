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
  { categoria: "EPP", nombre: "Casco en trabajo en alturas", tipo: "Amarillo, Blanco, Azul, Verde", unidad: "Unidad", variantes: ["Unica"] },
  { categoria: "EPP", nombre: "Gafas de seguridad", tipo: "Protección visual", unidad: "Unidad", variantes: ["Unica"] },
  { categoria: "EPP", nombre: "Careta Esmerilar", tipo: "Protección facial", unidad: "Unidad", variantes: ["Unica"] },
  { categoria: "EPP", nombre: "Visor de seguridad", tipo: "Protección facial", unidad: "Unidad", variantes: ["Unica"] },
  { categoria: "EPP", nombre: "Tapaoidos", tipo: "Inserción, Copa", unidad: "Par", variantes: ["Unica"] },
  { categoria: "EPP", nombre: "Mascara Respirador Media Cara", tipo: "Protección respiratoria", unidad: "Unidad", variantes: ["Unica"] },
  { categoria: "EPP", nombre: "Filtros mascara media cara", tipo: "Protección respiratoria", unidad: "Par", variantes: ["Unica"] },
  { categoria: "EPP", nombre: "Tapabocas N95", tipo: "Blanco, Negro", unidad: "Unidad", variantes: ["Unica"] },
  { categoria: "EPP", nombre: "Tapabocas quirurgico", tipo: "Azul, Negro", unidad: "Unidad", variantes: ["Unica"] },
  { categoria: "EPP", nombre: "Traje en PVC", tipo: "Protección corporal", unidad: "Unidad", variantes: ["S", "M", "L", "XL", "2XL"] },
  { categoria: "EPP", nombre: "Peto de carnaza", tipo: "Protección corporal", unidad: "Unidad", variantes: ["S", "M", "L", "XL", "2XL"] },
  { categoria: "EPP", nombre: "Delantal Industrial PVC", tipo: "Negro, Amarillo", unidad: "Unidad", variantes: ["Unica"] },
  { categoria: "EPP", nombre: "Guantes de lavanderia medio brazo", tipo: "Protección manos", unidad: "Par", variantes: ["S", "M", "L", "XL", "2XL"] },
  { categoria: "EPP", nombre: "Trajes Tyvec", tipo: "Protección corporal", unidad: "Unidad", variantes: ["S", "M", "L", "XL", "2XL"] },
  { categoria: "EPP", nombre: "Guantes de carnaza", tipo: "Protección manos", unidad: "Par", variantes: ["S", "M", "L", "XL", "2XL"] },
  { categoria: "EPP", nombre: "Guantes de nitrilo", tipo: "Protección manos", unidad: "Caja", variantes: ["S", "M", "L", "XL", "2XL"] },
  { categoria: "EPP", nombre: "Guantes de tela", tipo: "Protección manos", unidad: "Par", variantes: ["S", "M", "L", "XL", "2XL"] },
  { categoria: "EPP", nombre: "Guantes para calor", tipo: "Protección manos", unidad: "Par", variantes: ["S", "M", "L", "XL", "2XL"] },
  { categoria: "EPP", nombre: "Guantes dieléctricos", tipo: "Protección manos", unidad: "Par", variantes: ["S", "M", "L", "XL", "2XL"] },
  { categoria: "EPP", nombre: "Canguros (mantenimiento)", tipo: "Mantenimiento", unidad: "Unidad", variantes: ["Unica"] },
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
  tipoDotacion: "No aplica",
  sexo: "Femenino",
  estado: "Activo",
  tallaAntifluido: "N/A",
  tallaBata: "N/A",
  tallaCamisa: "N/A",
  tallaPantalon: "N/A",
  tallaBotas: "",
}

export const tiposDotacion = [
  "No aplica",
  "MSL Camisa azul 3/4 clara dama p. venta+MSL Jean mujer+Bota de seguridad",
  "MSL Operario azul dama uniforme+Bota de seguridad+MSL Cofia unisex",
  "MSL Bata azul oscura hombre admon+Bota de seguridad+MSL Cofia unisex",
  "MSL Operario azul hombre uniforme+Bota de seguridad+MSL Cofia unisex",
  "MSL Camisa polo hombre+MSL Jean hombre+Bota de seguridad+MSL Cofia unisex",
  "Bono Sodexo",
  "MSL Bata azul oscura dama admon+Bota de seguridad+MSL Cofia unisex",
  "MSL Bata azul oscura dama calidad+Bota de seguridad+MSL Cofia unisex",
  "MSL Bata Verde oscura hombre calidad+Bota de seguridad+MSL Cofia unisex",
  "MSL Camisa azul clara hombre p. venta+MSL Jean hombre+Bota de seguridad",
  "MSL Camisa jean hombre mtto+MSL Jean hombre+Bota de seguridad+MSL Cofia unisex",
  "MSL Bata azul oscura hombre admon+MSL Cofia unisex",
]

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
  { codigo: "740201", nombre: "Distribucion CEDI" },
  { codigo: "720101", nombre: "Generales Comercial" },
  { codigo: "730100", nombre: "Recolector Planta Ambientadores" },
  { codigo: "730301", nombre: "Recolector Solidos" },
  { codigo: "730201", nombre: "Recolector Planta Autos" },
  { codigo: "710201", nombre: "Generales Administracion" },
  { codigo: "730403", nombre: "Mtto Msl" },
  { codigo: "750301", nombre: "Gestion Ambiental" },
  { codigo: "730402", nombre: "Laboratorio Msl" },
  { codigo: "730701", nombre: "Generales Cadena de Abastecimiento" },
]
