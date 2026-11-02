import type { Document } from "mongodb";
import { db } from "../config/db";
import { MOTIVOS } from "../types/modelos";
import { textoAgregacion } from "../utils/consultaShell";
import { finDelDia, hoyEnChile, inicioDelDia, restarDias, ZONA_HORARIA } from "../utils/fechas";
import { noEncontrado, peticionInvalida } from "../utils/httpError";
import { fechaIso } from "../utils/validar";

/*
 * Reportes que se ejecutan desde la pantalla "Reportes" del frontend.
 * Cada uno muestra: el resultado, la agregación de MongoDB que se ejecutó
 * (generada a partir del mismo objeto que se envía a la base) y la consulta
 * SQL equivalente del modelo relacional de la Entrega 1.
 *
 *   JOIN      -> $lookup
 *   GROUP BY  -> $group
 *   WHERE     -> $match con operadores ($gte, $lt, $in, $expr, ...)
 */

type TipoParametro = "fecha" | "numero" | "opcion" | "categorias";

interface Parametro {
  nombre: string;
  etiqueta: string;
  tipo: TipoParametro;
  opciones?: { valor: string; etiqueta: string }[];
  porDefecto: () => string | number;
}

interface Columna {
  clave: string;
  etiqueta: string;
  tipo: "texto" | "numero" | "dinero" | "fecha" | "dia";
}

type Valores = Record<string, string | number | string[]>;

interface Reporte {
  id: string;
  titulo: string;
  descripcion: string;
  conceptos: string[];
  requerimiento: string;
  coleccion: string;
  parametros: Parametro[];
  columnas: Columna[];
  grafico?: { etiqueta: string; valor: string; titulo: string };
  sql: (v: Valores) => string;
  construir: (v: Valores) => Document[];
}

const hace30 = () => restarDias(hoyEnChile(), 30);
const hoy = () => hoyEnChile();
const rangoFechas = (v: Valores) => ({ $gte: inicioDelDia(String(v["desde"])), $lt: finDelDia(String(v["hasta"])) });
const PARAMS_FECHA: Parametro[] = [
  { nombre: "desde", etiqueta: "Desde", tipo: "fecha", porDefecto: hace30 },
  { nombre: "hasta", etiqueta: "Hasta", tipo: "fecha", porDefecto: hoy },
];
const listaSql = (l: string[]) => l.map((x) => `'${x.replace(/'/g, "''")}'`).join(", ");
const siEs = (tipo: string, valor: string | number) => ({ $cond: [{ $eq: ["$tipoMovimiento", tipo] }, valor, 0] });

export const REPORTES: Reporte[] = [
  {
    id: "valor-por-categoria",
    titulo: "Valor del inventario por categoría",
    descripcion: "Cuántos productos y unidades hay en cada categoría, cuánto dinero representan y cuántos están en alerta.",
    conceptos: ["GROUP BY ($group)", "Operadores ($sum, $multiply, $cond, $lte)"],
    requerimiento: "RF14",
    coleccion: "productos",
    parametros: [],
    columnas: [
      { clave: "categoria", etiqueta: "Categoría", tipo: "texto" },
      { clave: "productos", etiqueta: "Productos", tipo: "numero" },
      { clave: "unidades", etiqueta: "Unidades", tipo: "numero" },
      { clave: "enAlerta", etiqueta: "En alerta", tipo: "numero" },
      { clave: "valorInventario", etiqueta: "Valor a precio de venta", tipo: "dinero" },
    ],
    grafico: { etiqueta: "categoria", valor: "valorInventario", titulo: "Valor del inventario ($)" },
    sql: () => `SELECT c.nombre                         AS categoria,
       COUNT(*)                         AS productos,
       SUM(i.stockActual)               AS unidades,
       SUM(CASE WHEN i.stockActual <= p.stockMinimo THEN 1 ELSE 0 END) AS enAlerta,
       SUM(p.precioVenta * i.stockActual) AS valorInventario
FROM   producto p
JOIN   categoria  c ON c.idCategoria = p.idCategoria
JOIN   inventario i ON i.idProducto  = p.idProducto
WHERE  p.estado = 'activo'
GROUP  BY c.nombre
ORDER  BY valorInventario DESC;`,
    construir: () => [
      { $match: { estado: "activo" } },
      {
        $group: {
          _id: "$categoria.nombre",
          productos: { $sum: 1 },
          unidades: { $sum: "$inventario.stockActual" },
          enAlerta: { $sum: { $cond: [{ $lte: ["$inventario.stockActual", "$stockMinimo"] }, 1, 0] } },
          valorInventario: { $sum: { $multiply: ["$precioVenta", "$inventario.stockActual"] } },
        },
      },
      { $project: { _id: 0, categoria: "$_id", productos: 1, unidades: 1, enAlerta: 1, valorInventario: 1 } },
      { $sort: { valorInventario: -1 } },
    ],
  },
  {
    id: "mas-salidas",
    titulo: "Productos con más salidas",
    descripcion: "Los productos que más unidades sacaron de bodega en un período, con su stock actual. Sirve para saber qué se vende más.",
    conceptos: ["JOIN ($lookup)", "GROUP BY ($group)", "Operadores ($gte, $lt, $multiply)", "LIMIT"],
    requerimiento: "RF13",
    coleccion: "movimientos",
    parametros: [
      ...PARAMS_FECHA,
      {
        nombre: "motivo",
        etiqueta: "Motivo",
        tipo: "opcion",
        opciones: [{ valor: "", etiqueta: "Todos" }, ...MOTIVOS.salida.map((m) => ({ valor: m, etiqueta: m }))],
        porDefecto: () => "",
      },
      { nombre: "limite", etiqueta: "Cuántos mostrar", tipo: "numero", porDefecto: () => 10 },
    ],
    columnas: [
      { clave: "sku", etiqueta: "SKU", tipo: "texto" },
      { clave: "producto", etiqueta: "Producto", tipo: "texto" },
      { clave: "categoria", etiqueta: "Categoría", tipo: "texto" },
      { clave: "unidades", etiqueta: "Unidades", tipo: "numero" },
      { clave: "movimientos", etiqueta: "Salidas", tipo: "numero" },
      { clave: "stockActual", etiqueta: "Stock actual", tipo: "numero" },
      { clave: "montoEstimado", etiqueta: "Monto estimado", tipo: "dinero" },
    ],
    grafico: { etiqueta: "producto", valor: "unidades", titulo: "Unidades que salieron" },
    sql: (v) => `SELECT p.sku, p.nombre AS producto, c.nombre AS categoria,
       SUM(m.cantidad)                 AS unidades,
       COUNT(*)                        AS movimientos,
       i.stockActual,
       SUM(m.cantidad) * p.precioVenta AS montoEstimado
FROM   movimiento_inventario m
JOIN   producto   p ON p.idProducto  = m.idProducto
JOIN   categoria  c ON c.idCategoria = p.idCategoria
JOIN   inventario i ON i.idProducto  = p.idProducto
WHERE  m.tipoMovimiento = 'salida'
  AND  m.fechaHora >= '${v["desde"]}' AND m.fechaHora < '${v["hasta"]}'::date + 1${v["motivo"] ? `\n  AND  m.motivo = '${v["motivo"]}'` : ""}
GROUP  BY p.idProducto, p.sku, p.nombre, c.nombre, i.stockActual, p.precioVenta
ORDER  BY unidades DESC
LIMIT  ${v["limite"]};`,
    construir: (v) => [
      { $match: { tipoMovimiento: "salida", fechaHora: rangoFechas(v), ...(v["motivo"] ? { motivo: v["motivo"] } : {}) } },
      { $group: { _id: "$producto._id", unidades: { $sum: "$cantidad" }, movimientos: { $sum: 1 } } },
      { $sort: { unidades: -1 } },
      { $limit: Number(v["limite"]) },
      { $lookup: { from: "productos", localField: "_id", foreignField: "_id", as: "producto" } },
      { $unwind: "$producto" },
      {
        $project: {
          _id: 0,
          sku: "$producto.sku",
          producto: "$producto.nombre",
          categoria: "$producto.categoria.nombre",
          unidades: 1,
          movimientos: 1,
          stockActual: "$producto.inventario.stockActual",
          montoEstimado: { $multiply: ["$unidades", "$producto.precioVenta"] },
        },
      },
    ],
  },
  {
    id: "actividad-usuarios",
    titulo: "Movimientos registrados por usuario",
    descripcion: "Cuántas entradas y salidas registró cada persona del personal en el período y cuándo fue su último registro (trazabilidad).",
    conceptos: ["JOIN ($lookup)", "GROUP BY ($group)", "Operadores ($cond, $eq, $max, $add)"],
    requerimiento: "RNF06",
    coleccion: "movimientos",
    parametros: PARAMS_FECHA,
    columnas: [
      { clave: "usuario", etiqueta: "Usuario", tipo: "texto" },
      { clave: "rol", etiqueta: "Rol", tipo: "texto" },
      { clave: "entradas", etiqueta: "Entradas", tipo: "numero" },
      { clave: "salidas", etiqueta: "Salidas", tipo: "numero" },
      { clave: "total", etiqueta: "Total", tipo: "numero" },
      { clave: "unidadesMovidas", etiqueta: "Unidades movidas", tipo: "numero" },
      { clave: "ultimoRegistro", etiqueta: "Último registro", tipo: "fecha" },
    ],
    grafico: { etiqueta: "usuario", valor: "total", titulo: "Movimientos registrados" },
    sql: (v) => `SELECT u.nombreCompleto AS usuario, r.nombreRol AS rol,
       SUM(CASE WHEN m.tipoMovimiento = 'entrada' THEN 1 ELSE 0 END) AS entradas,
       SUM(CASE WHEN m.tipoMovimiento = 'salida'  THEN 1 ELSE 0 END) AS salidas,
       COUNT(*)         AS total,
       SUM(m.cantidad)  AS unidadesMovidas,
       MAX(m.fechaHora) AS ultimoRegistro
FROM   movimiento_inventario m
JOIN   usuario u ON u.idUsuario = m.idUsuario
JOIN   rol     r ON r.idRol     = u.idRol
WHERE  m.fechaHora >= '${v["desde"]}' AND m.fechaHora < '${v["hasta"]}'::date + 1
GROUP  BY u.idUsuario, u.nombreCompleto, r.nombreRol
ORDER  BY total DESC;`,
    construir: (v) => [
      { $match: { fechaHora: rangoFechas(v) } },
      {
        $group: {
          _id: "$usuario._id",
          entradas: { $sum: siEs("entrada", 1) },
          salidas: { $sum: siEs("salida", 1) },
          unidadesMovidas: { $sum: "$cantidad" },
          ultimoRegistro: { $max: "$fechaHora" },
        },
      },
      { $lookup: { from: "usuarios", localField: "_id", foreignField: "_id", as: "usuario" } },
      { $unwind: "$usuario" },
      {
        $project: {
          _id: 0,
          usuario: "$usuario.nombreCompleto",
          rol: "$usuario.rol",
          entradas: 1,
          salidas: 1,
          total: { $add: ["$entradas", "$salidas"] },
          unidadesMovidas: 1,
          ultimoRegistro: 1,
        },
      },
      { $sort: { total: -1 } },
    ],
  },
  {
    id: "reponer",
    titulo: "Productos por reponer y a quién llamar",
    descripcion: "Los productos en o bajo su stock mínimo (consulta C08) junto con el teléfono y correo de su proveedor.",
    conceptos: ["JOIN ($lookup)", "Operadores ($expr, $lte, $subtract, $ifNull)"],
    requerimiento: "RF14",
    coleccion: "productos",
    parametros: [],
    columnas: [
      { clave: "sku", etiqueta: "SKU", tipo: "texto" },
      { clave: "producto", etiqueta: "Producto", tipo: "texto" },
      { clave: "stockActual", etiqueta: "Stock", tipo: "numero" },
      { clave: "stockMinimo", etiqueta: "Mínimo", tipo: "numero" },
      { clave: "faltante", etiqueta: "Faltante", tipo: "numero" },
      { clave: "proveedor", etiqueta: "Proveedor", tipo: "texto" },
      { clave: "telefono", etiqueta: "Teléfono", tipo: "texto" },
      { clave: "email", etiqueta: "Correo", tipo: "texto" },
    ],
    sql: () => `SELECT p.sku, p.nombre AS producto, i.stockActual, p.stockMinimo,
       p.stockMinimo - i.stockActual          AS faltante,
       COALESCE(pr.razonSocial, 'Sin proveedor') AS proveedor,
       pr.telefono, pr.email
FROM   producto p
JOIN   inventario i      ON i.idProducto   = p.idProducto
LEFT   JOIN proveedor pr ON pr.idProveedor = p.idProveedor
WHERE  p.estado = 'activo'
  AND  i.stockActual <= p.stockMinimo
ORDER  BY faltante DESC;`,
    construir: () => [
      { $match: { estado: "activo", $expr: { $lte: ["$inventario.stockActual", "$stockMinimo"] } } },
      { $lookup: { from: "proveedores", localField: "proveedor._id", foreignField: "_id", as: "prov" } },
      { $unwind: { path: "$prov", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          sku: 1,
          producto: "$nombre",
          stockActual: "$inventario.stockActual",
          stockMinimo: 1,
          faltante: { $subtract: ["$stockMinimo", "$inventario.stockActual"] },
          proveedor: { $ifNull: ["$prov.razonSocial", "Sin proveedor"] },
          telefono: { $ifNull: ["$prov.telefono", "—"] },
          email: { $ifNull: ["$prov.email", "—"] },
        },
      },
      { $sort: { faltante: -1, producto: 1 } },
    ],
  },
  {
    id: "por-proveedor",
    titulo: "Productos y stock por proveedor",
    descripcion: "Para cada proveedor: cuántos productos activos surte, cuántas unidades hay en bodega y cuánto valen. Incluye proveedores sin productos.",
    conceptos: ["LEFT JOIN ($lookup)", "Agregación ($size, $sum, $map, $multiply)"],
    requerimiento: "RF15",
    coleccion: "proveedores",
    parametros: [],
    columnas: [
      { clave: "proveedor", etiqueta: "Proveedor", tipo: "texto" },
      { clave: "telefono", etiqueta: "Teléfono", tipo: "texto" },
      { clave: "productos", etiqueta: "Productos", tipo: "numero" },
      { clave: "unidades", etiqueta: "Unidades", tipo: "numero" },
      { clave: "valorInventario", etiqueta: "Valor", tipo: "dinero" },
    ],
    grafico: { etiqueta: "proveedor", valor: "productos", titulo: "Productos activos" },
    sql: () => `SELECT pr.razonSocial AS proveedor, pr.telefono,
       COUNT(p.idProducto)                           AS productos,
       COALESCE(SUM(i.stockActual), 0)               AS unidades,
       COALESCE(SUM(p.precioVenta * i.stockActual), 0) AS valorInventario
FROM   proveedor pr
LEFT   JOIN producto   p ON p.idProveedor = pr.idProveedor AND p.estado = 'activo'
LEFT   JOIN inventario i ON i.idProducto  = p.idProducto
GROUP  BY pr.idProveedor, pr.razonSocial, pr.telefono
ORDER  BY productos DESC, proveedor;`,
    construir: () => [
      {
        $lookup: {
          from: "productos",
          localField: "_id",
          foreignField: "proveedor._id",
          pipeline: [{ $match: { estado: "activo" } }],
          as: "productos",
        },
      },
      {
        $project: {
          _id: 0,
          proveedor: "$razonSocial",
          telefono: 1,
          productos: { $size: "$productos" },
          unidades: { $sum: "$productos.inventario.stockActual" },
          valorInventario: {
            $sum: { $map: { input: "$productos", in: { $multiply: ["$$this.precioVenta", "$$this.inventario.stockActual"] } } },
          },
        },
      },
      { $sort: { productos: -1, proveedor: 1 } },
    ],
  },
  {
    id: "catalogo-filtrado",
    titulo: "Catálogo filtrado por categoría y precio",
    descripcion: "Productos activos con stock de las categorías elegidas y dentro de un rango de precio (consulta C07).",
    conceptos: ["Operadores ($in, $gte, $lte, $gt)", "ORDER BY ($sort)"],
    requerimiento: "RF01–RF03",
    coleccion: "productos",
    parametros: [
      { nombre: "categorias", etiqueta: "Categorías", tipo: "categorias", porDefecto: () => "Herramientas manuales,Herramientas eléctricas" },
      { nombre: "precioMin", etiqueta: "Precio mínimo", tipo: "numero", porDefecto: () => 2000 },
      { nombre: "precioMax", etiqueta: "Precio máximo", tipo: "numero", porDefecto: () => 50000 },
    ],
    columnas: [
      { clave: "sku", etiqueta: "SKU", tipo: "texto" },
      { clave: "nombre", etiqueta: "Producto", tipo: "texto" },
      { clave: "categoria", etiqueta: "Categoría", tipo: "texto" },
      { clave: "precioVenta", etiqueta: "Precio", tipo: "dinero" },
      { clave: "stockActual", etiqueta: "Stock", tipo: "numero" },
    ],
    sql: (v) => `SELECT p.sku, p.nombre, c.nombre AS categoria, p.precioVenta, i.stockActual
FROM   producto p
JOIN   categoria  c ON c.idCategoria = p.idCategoria
JOIN   inventario i ON i.idProducto  = p.idProducto
WHERE  p.estado = 'activo'
  AND  c.nombre IN (${listaSql(v["categorias"] as string[])})
  AND  p.precioVenta BETWEEN ${v["precioMin"]} AND ${v["precioMax"]}
  AND  i.stockActual > 0
ORDER  BY p.nombre;`,
    construir: (v) => [
      {
        $match: {
          estado: "activo",
          "categoria.nombre": { $in: v["categorias"] },
          precioVenta: { $gte: Number(v["precioMin"]), $lte: Number(v["precioMax"]) },
          "inventario.stockActual": { $gt: 0 },
        },
      },
      {
        $project: {
          _id: 0, sku: 1, nombre: 1, categoria: "$categoria.nombre", precioVenta: 1, stockActual: "$inventario.stockActual",
        },
      },
      { $sort: { nombre: 1 } },
    ],
  },
  {
    id: "movimientos-por-dia",
    titulo: "Entradas y salidas por día",
    descripcion: "Unidades que entraron y salieron cada día del período, en hora de Chile, y el balance del día.",
    conceptos: ["GROUP BY por fecha ($group + $dateToString)", "Operadores ($cond, $subtract)"],
    requerimiento: "RF13",
    coleccion: "movimientos",
    parametros: PARAMS_FECHA,
    columnas: [
      { clave: "dia", etiqueta: "Día", tipo: "dia" },
      { clave: "movimientos", etiqueta: "Movimientos", tipo: "numero" },
      { clave: "entradas", etiqueta: "Unidades que entraron", tipo: "numero" },
      { clave: "salidas", etiqueta: "Unidades que salieron", tipo: "numero" },
      { clave: "balance", etiqueta: "Balance", tipo: "numero" },
    ],
    grafico: { etiqueta: "dia", valor: "salidas", titulo: "Unidades que salieron por día" },
    sql: (v) => `SELECT DATE(m.fechaHora AT TIME ZONE 'America/Santiago') AS dia,
       COUNT(*) AS movimientos,
       SUM(CASE WHEN m.tipoMovimiento = 'entrada' THEN m.cantidad ELSE 0 END) AS entradas,
       SUM(CASE WHEN m.tipoMovimiento = 'salida'  THEN m.cantidad ELSE 0 END) AS salidas,
       SUM(CASE WHEN m.tipoMovimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END) AS balance
FROM   movimiento_inventario m
WHERE  m.fechaHora >= '${v["desde"]}' AND m.fechaHora < '${v["hasta"]}'::date + 1
GROUP  BY dia
ORDER  BY dia;`,
    construir: (v) => [
      { $match: { fechaHora: rangoFechas(v) } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$fechaHora", timezone: ZONA_HORARIA } },
          movimientos: { $sum: 1 },
          entradas: { $sum: siEs("entrada", "$cantidad") },
          salidas: { $sum: siEs("salida", "$cantidad") },
        },
      },
      { $project: { _id: 0, dia: "$_id", movimientos: 1, entradas: 1, salidas: 1, balance: { $subtract: ["$entradas", "$salidas"] } } },
      { $sort: { dia: 1 } },
    ],
  },
];

/** Lista de reportes para el menú (sin ejecutar nada). */
export function listarReportes() {
  return REPORTES.map(({ construir: _c, sql: _s, parametros, ...r }) => ({
    ...r,
    parametros: parametros.map(({ porDefecto, ...p }) => ({ ...p, porDefecto: porDefecto() })),
  }));
}

function leerValores(r: Reporte, consulta: Record<string, unknown>): Valores {
  const v: Valores = {};
  for (const p of r.parametros) {
    const crudo = consulta[p.nombre];
    const texto = crudo === undefined || crudo === "" ? undefined : String(crudo);
    switch (p.tipo) {
      case "fecha":
        v[p.nombre] = fechaIso(texto, p.nombre) ?? String(p.porDefecto());
        break;
      case "numero": {
        const n = texto === undefined ? Number(p.porDefecto()) : Number(texto);
        if (!Number.isInteger(n) || n < 0 || n > 100_000_000) throw peticionInvalida(`"${p.etiqueta}" debe ser un número entero positivo`);
        v[p.nombre] = n;
        break;
      }
      case "opcion": {
        const valor = texto ?? String(p.porDefecto());
        if (!p.opciones?.some((o) => o.valor === valor)) throw peticionInvalida(`"${p.etiqueta}" no tiene un valor permitido`);
        v[p.nombre] = valor;
        break;
      }
      case "categorias": {
        const lista = (texto ?? String(p.porDefecto())).split(",").map((x) => x.trim()).filter(Boolean);
        if (lista.length === 0) throw peticionInvalida("Elige al menos una categoría");
        v[p.nombre] = lista;
        break;
      }
    }
  }
  if (typeof v["desde"] === "string" && typeof v["hasta"] === "string" && v["desde"] > v["hasta"]) {
    throw peticionInvalida("La fecha “Desde” no puede ser posterior a “Hasta”");
  }
  if (typeof v["precioMin"] === "number" && typeof v["precioMax"] === "number" && v["precioMin"] > v["precioMax"]) {
    throw peticionInvalida("El precio mínimo no puede ser mayor que el máximo");
  }
  if (typeof v["limite"] === "number" && (v["limite"] < 1 || v["limite"] > 50)) {
    throw peticionInvalida("“Cuántos mostrar” debe estar entre 1 y 50");
  }
  return v;
}

/** Ejecuta un reporte y devuelve los datos junto con la consulta que se usó. */
export async function ejecutarReporte(id: string, consulta: Record<string, unknown>) {
  const r = REPORTES.find((x) => x.id === id);
  if (!r) throw noEncontrado(`El reporte "${id}"`);
  const valores = leerValores(r, consulta);
  const pipeline = r.construir(valores);

  const inicio = performance.now();
  const filas = await db.collection(r.coleccion).aggregate(pipeline).toArray();
  const milisegundos = Math.round(performance.now() - inicio);

  return {
    id: r.id,
    titulo: r.titulo,
    valores,
    columnas: r.columnas,
    grafico: r.grafico ?? null,
    filas,
    milisegundos,
    consultaMongo: textoAgregacion(r.coleccion, pipeline),
    consultaSql: r.sql(valores),
  };
}
