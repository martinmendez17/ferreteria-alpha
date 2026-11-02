import { MongoClient } from "mongodb";
import type { CategoriaDoc, MovimientoDoc, ProductoDoc, ProveedorDoc, UsuarioDoc } from "../types/modelos";
import { env } from "./env";

/**
 * Un solo cliente de MongoDB para toda la aplicación. El driver mantiene
 * un grupo de conexiones abiertas y las reutiliza en cada petición.
 */
export const cliente = new MongoClient(env.mongodbUri, {
  appName: "ferreteria-alpha",
  serverSelectionTimeoutMS: 10_000,
});

export const db = cliente.db(env.mongodbDb);

/** Las 5 colecciones del modelo, con el tipo de sus documentos. */
export const col = {
  usuarios: db.collection<UsuarioDoc>("usuarios"),
  categorias: db.collection<CategoriaDoc>("categorias"),
  proveedores: db.collection<ProveedorDoc>("proveedores"),
  productos: db.collection<ProductoDoc>("productos"),
  movimientos: db.collection<MovimientoDoc>("movimientos"),
};

export async function conectar() {
  await cliente.connect();
  await db.command({ ping: 1 });
}

/** Orden alfabético en español (la "ñ" y los tildes se ordenan bien). */
export const COLACION_ES = { locale: "es", strength: 1 } as const;
