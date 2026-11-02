// npm run db:probar — muestra que el backend se conecta a la base y lee cada tabla
import { prisma } from "../src/config/prisma";

const [{ version }] = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
console.log("Conectado a:", version);

const conteos = {
  rol: await prisma.rol.count(),
  usuario: await prisma.usuario.count(),
  categoria: await prisma.categoria.count(),
  proveedor: await prisma.proveedor.count(),
  producto: await prisma.producto.count(),
  inventario: await prisma.inventario.count(),
  movimiento_inventario: await prisma.movimientoInventario.count(),
};
console.table(conteos);

await prisma.$disconnect();
