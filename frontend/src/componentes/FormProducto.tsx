import { useState, type FormEvent, type ReactNode } from "react";
import { api, ErrorApi, mensajeDeError } from "../api/cliente";
import type { Categoria, ProductoAdmin, Proveedor } from "../api/tipos";
import { usarDatos } from "../utils/usarDatos";
import { ImagenProducto } from "./ImagenProducto";
import { Aviso } from "./Ui";
import { Ventana } from "./Ventana";

const UNIDADES = ["unidad", "caja", "galón", "rollo", "metro", "kilo", "litro", "par", "set"];

type Campos = {
  sku: string; nombre: string; marca: string; idCategoria: string; idProveedor: string; precioVenta: string;
  unidadMedida: string; stockMinimo: string; ubicacionBodega: string; descripcion: string; palabrasClave: string; imagenUrl: string;
};

function validar(c: Campos): Partial<Record<keyof Campos, string>> {
  const e: Partial<Record<keyof Campos, string>> = {};
  if (!c.sku.trim()) e.sku = "El SKU es obligatorio";
  else if (!/^[A-Za-z0-9-]{3,40}$/.test(c.sku.trim())) e.sku = "Usa solo letras, números y guiones (ej. MED-0060)";
  if (!c.nombre.trim()) e.nombre = "El nombre es obligatorio";
  if (!c.idCategoria) e.idCategoria = "Elige una categoría";
  if (c.precioVenta === "" || !Number.isInteger(Number(c.precioVenta))) e.precioVenta = "Escribe el precio en pesos, sin puntos";
  if (!c.unidadMedida.trim()) e.unidadMedida = "La unidad es obligatoria";
  if (c.stockMinimo === "" || !Number.isInteger(Number(c.stockMinimo))) e.stockMinimo = "Escribe un número entero (0 o más)";
  const url = c.imagenUrl.trim();
  if (url && !url.startsWith("/") && !/^https?:\/\/\S+$/i.test(url)) e.imagenUrl = "El enlace debe empezar con https://";
  return e;
}

/** RF09: formulario para crear o editar un producto (solo Administrador). */
export function FormProducto({ producto, alCerrar, alGuardar }: { producto?: ProductoAdmin; alCerrar: () => void; alGuardar: (p: ProductoAdmin) => void }) {
  const [c, setC] = useState<Campos>({
    sku: producto?.sku ?? "",
    nombre: producto?.nombre ?? "",
    marca: producto?.marca ?? "",
    idCategoria: producto?.categoria._id ?? "",
    idProveedor: producto?.proveedor?._id ?? "",
    precioVenta: producto ? String(producto.precioVenta) : "",
    unidadMedida: producto?.unidadMedida ?? "unidad",
    stockMinimo: producto ? String(producto.stockMinimo) : "",
    ubicacionBodega: producto?.inventario.ubicacionBodega ?? "",
    descripcion: producto?.descripcion ?? "",
    palabrasClave: producto?.palabrasClave.join(", ") ?? "",
    imagenUrl: producto?.imagenUrl ?? "",
  });
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const categorias = usarDatos((signal) => api<Categoria[]>("/categorias", { signal }), []);
  const proveedores = usarDatos((signal) => api<Proveedor[]>("/proveedores", { signal }), []);

  const cambiar = (campo: keyof Campos) => (e: { target: { value: string } }) => {
    setC((x) => ({ ...x, [campo]: e.target.value }));
    if (errores[campo]) setErrores((x) => ({ ...x, [campo]: undefined }));
  };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const encontrados = validar(c);
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;
    setEnviando(true);
    setErrorGeneral(null);
    const cuerpo = {
      sku: c.sku.trim(),
      nombre: c.nombre.trim(),
      marca: c.marca.trim() || null,
      idCategoria: c.idCategoria,
      idProveedor: c.idProveedor || null,
      precioVenta: Number(c.precioVenta),
      unidadMedida: c.unidadMedida.trim(),
      stockMinimo: Number(c.stockMinimo),
      ubicacionBodega: c.ubicacionBodega.trim() || null,
      descripcion: c.descripcion.trim() || null,
      palabrasClave: c.palabrasClave.split(",").map((p) => p.trim()).filter(Boolean),
      imagenUrl: c.imagenUrl.trim() || null,
    };
    try {
      const guardado = producto
        ? await api<ProductoAdmin>(`/productos/${producto._id}`, { metodo: "PUT", cuerpo })
        : await api<ProductoAdmin>("/productos", { metodo: "POST", cuerpo });
      alGuardar(guardado);
    } catch (err) {
      const campo = err instanceof ErrorApi ? (err.campo as keyof Campos | undefined) : undefined;
      if (campo && campo in c) setErrores((x) => ({ ...x, [campo]: mensajeDeError(err) }));
      else setErrorGeneral(mensajeDeError(err));
      setEnviando(false);
    }
  }

  const campo = (nombre: keyof Campos, etiqueta: string, control: ReactNode, ayuda?: string, ancho = "col-md-6") => (
    <div className={ancho}>
      <label className="form-label" htmlFor={`p-${nombre}`}>{etiqueta}</label>
      {control}
      {errores[nombre] ? <div className="invalid-feedback d-block">{errores[nombre]}</div> : ayuda && <div className="form-text">{ayuda}</div>}
    </div>
  );
  const clase = (n: keyof Campos, base = "form-control") => `${base} ${errores[n] ? "is-invalid" : ""}`;

  return (
    <Ventana
      grande
      titulo={producto ? `Editar ${producto.nombre}` : "Nuevo producto"}
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="btn btn-secundario" onClick={alCerrar}>Cancelar</button>
          <button type="submit" form="form-producto" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Guardando…" : producto ? "Guardar cambios" : "Crear producto"}
          </button>
        </>
      }
    >
      {errorGeneral && <Aviso tipo="error" className="mb-3">{errorGeneral}</Aviso>}
      <form id="form-producto" onSubmit={enviar} noValidate>
        <div className="row g-3">
          {campo("sku", "SKU (código)", <input id="p-sku" className={clase("sku")} value={c.sku} onChange={cambiar("sku")} maxLength={40} style={{ textTransform: "uppercase" }} />, "Único. Ej.: MED-0060")}
          {campo("nombre", "Nombre", <input id="p-nombre" className={clase("nombre")} value={c.nombre} onChange={cambiar("nombre")} maxLength={150} />)}
          {campo("marca", "Marca", <input id="p-marca" className={clase("marca")} value={c.marca} onChange={cambiar("marca")} maxLength={60} />, "Se muestra en la ficha y sirve para buscar")}
          {campo("idCategoria", "Categoría",
            <select id="p-idCategoria" className={clase("idCategoria", "form-select")} value={c.idCategoria} onChange={cambiar("idCategoria")}>
              <option value="">Elige una categoría</option>
              {categorias.datos?.map((x) => <option key={x._id} value={x._id}>{x.nombre}</option>)}
            </select>)}
          {campo("idProveedor", "Proveedor",
            <select id="p-idProveedor" className={clase("idProveedor", "form-select")} value={c.idProveedor} onChange={cambiar("idProveedor")}>
              <option value="">Sin proveedor</option>
              {proveedores.datos?.map((x) => <option key={x._id} value={x._id}>{x.razonSocial}</option>)}
            </select>)}
          {campo("precioVenta", "Precio de venta ($)", <input id="p-precioVenta" className={clase("precioVenta")} inputMode="numeric" value={c.precioVenta} onChange={(e) => cambiar("precioVenta")({ target: { value: e.target.value.replace(/\D/g, "").slice(0, 9) } })} />, "En pesos, sin puntos ni decimales")}
          {campo("unidadMedida", "Unidad de venta",
            <><input id="p-unidadMedida" className={clase("unidadMedida")} list="unidades" value={c.unidadMedida} onChange={cambiar("unidadMedida")} maxLength={20} />
              <datalist id="unidades">{UNIDADES.map((u) => <option key={u} value={u} />)}</datalist></>, undefined, "col-md-3")}
          {campo("stockMinimo", "Stock mínimo", <input id="p-stockMinimo" className={clase("stockMinimo")} inputMode="numeric" value={c.stockMinimo} onChange={(e) => cambiar("stockMinimo")({ target: { value: e.target.value.replace(/\D/g, "").slice(0, 6) } })} />, "Bajo este número se alerta", "col-md-3")}
          {campo("ubicacionBodega", "Ubicación en bodega", <input id="p-ubicacionBodega" className={clase("ubicacionBodega")} value={c.ubicacionBodega} onChange={cambiar("ubicacionBodega")} maxLength={60} placeholder="Pasillo 1-A" />)}
          {campo("palabrasClave", "Palabras clave", <input id="p-palabrasClave" className={clase("palabrasClave")} value={c.palabrasClave} onChange={cambiar("palabrasClave")} placeholder="martillo, carpintería, clavos" />, "Separadas por coma. Ayudan a encontrarlo en el buscador")}
          {campo("descripcion", "Descripción", <textarea id="p-descripcion" className={clase("descripcion")} rows={2} value={c.descripcion} onChange={cambiar("descripcion")} maxLength={2000} />, undefined, "col-12")}
          <div className="col-12">
            <label className="form-label" htmlFor="p-imagenUrl">Imagen (enlace)</label>
            <div className="d-flex gap-3 align-items-start">
              <div className="miniatura" style={{ width: "4.5rem", height: "4.5rem" }}><ImagenProducto key={c.imagenUrl} url={c.imagenUrl.trim() || null} alt="Vista previa" /></div>
              <div className="flex-grow-1">
                <input id="p-imagenUrl" className={clase("imagenUrl")} value={c.imagenUrl} onChange={cambiar("imagenUrl")} placeholder="https://…/foto.jpg" maxLength={500} />
                {errores.imagenUrl ? <div className="invalid-feedback d-block">{errores.imagenUrl}</div>
                  : <div className="form-text">Pega el enlace de una imagen. Si queda vacío, se muestra un ícono.</div>}
              </div>
            </div>
          </div>
        </div>
        {!producto && <Aviso tipo="info" className="mt-3">El producto parte con stock 0. Para sumar unidades, registra una entrada desde Inventario.</Aviso>}
      </form>
    </Ventana>
  );
}
