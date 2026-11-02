import { useState, type FormEvent } from "react";
import { api, ErrorApi, mensajeDeError } from "../api/cliente";
import { MOTIVOS, type FilaInventario, type ResultadoMovimiento, type TipoMovimiento } from "../api/tipos";
import { useSesion } from "../contexto/Sesion";
import { numero } from "../utils/formato";
import { Aviso } from "./Ui";
import { Ventana } from "./Ventana";

/**
 * RF10–RF12: ventana para registrar una entrada o una salida.
 * Si la cantidad supera el stock, el error aparece junto al campo y el
 * botón queda deshabilitado (boceto "salida con error"). El servidor vuelve
 * a validar el stock en la base antes de guardar.
 */
export function ModalMovimiento({
  producto, tipo, alCerrar, alRegistrar,
}: {
  producto: FilaInventario;
  tipo: TipoMovimiento;
  alCerrar: () => void;
  alRegistrar: (r: ResultadoMovimiento) => void;
}) {
  const { usuario } = useSesion();
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState(MOTIVOS[tipo][0]!);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<{ mensaje: string; campo?: string } | null>(null);

  const stock = producto.inventario.stockActual;
  const n = Number(cantidad);
  let errorCantidad: string | null = null;
  if (cantidad !== "") {
    if (!Number.isInteger(n) || n < 1) errorCantidad = "Escribe un número entero mayor que 0.";
    else if (n > 100_000) errorCantidad = "La cantidad es demasiado grande.";
    else if (tipo === "salida" && n > stock) errorCantidad = `La cantidad supera el stock disponible (${numero(stock)} ${stock === 1 ? "unidad" : "unidades"}).`;
  }
  if (errorServidor?.campo === "cantidad") errorCantidad = errorServidor.mensaje;
  const valido = cantidad !== "" && !errorCantidad;
  const stockDespues = valido ? stock + (tipo === "entrada" ? n : -n) : null;
  const esSalida = tipo === "salida";
  const textoBoton = esSalida ? "Registrar salida" : "Registrar entrada";

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErrorServidor(null);
    try {
      const r = await api<ResultadoMovimiento>("/movimientos", {
        metodo: "POST",
        cuerpo: { idProducto: producto._id, tipoMovimiento: tipo, cantidad: n, motivo },
      });
      alRegistrar(r);
    } catch (err) {
      setErrorServidor({ mensaje: mensajeDeError(err), campo: err instanceof ErrorApi ? err.campo : undefined });
      setEnviando(false);
    }
  }

  return (
    <Ventana
      titulo={esSalida ? "Registrar salida de stock" : "Registrar entrada de stock"}
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="btn btn-secundario" onClick={alCerrar}>Cancelar</button>
          <button type="submit" form="form-movimiento" className="btn btn-primary" disabled={!valido || enviando}>
            {enviando ? "Guardando…" : textoBoton}
          </button>
        </>
      }
    >
      <div className="caja-producto mb-3">
        <div className="fw-bold" style={{ fontSize: "1rem" }}>{producto.nombre}</div>
        <div className="texto-secundario small mt-1">
          SKU <span className="codigo">{producto.sku}</span> · Stock disponible: <strong className="text-dark">{numero(stock)}</strong> · Mínimo: {producto.stockMinimo}
        </div>
      </div>

      <form id="form-movimiento" onSubmit={enviar} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="cantidad">Cantidad ({producto.unidadMedida})</label>
          <input
            id="cantidad"
            className={`form-control ${errorCantidad ? "is-invalid" : ""}`}
            inputMode="numeric"
            autoComplete="off"
            value={cantidad}
            onChange={(e) => {
              setCantidad(e.target.value.replace(/[^\d]/g, "").slice(0, 7));
              if (errorServidor) setErrorServidor(null);
            }}
            aria-invalid={!!errorCantidad}
            aria-describedby="ayuda-cantidad"
          />
          <div id="ayuda-cantidad">
            {errorCantidad ? (
              <div className="invalid-feedback d-block">{errorCantidad}</div>
            ) : stockDespues !== null ? (
              <div className="form-text">Stock después del registro: <strong>{numero(stockDespues)}</strong>{stockDespues <= producto.stockMinimo && " · quedará en o bajo el mínimo"}</div>
            ) : null}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="motivo">Motivo</label>
          <select id="motivo" className="form-select" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS[tipo].map((m) => <option key={m}>{m}</option>)}
          </select>
          <div className="form-text">Opciones: {MOTIVOS[tipo].map((m) => m.toLowerCase()).join(" · ")}</div>
        </div>

        {errorServidor && errorServidor.campo !== "cantidad" && <Aviso tipo="error" className="mb-3">{errorServidor.mensaje}</Aviso>}

        <p className="texto-secundario small mb-0">
          Se registrará a nombre de {usuario?.nombreCompleto} con la fecha y hora actuales.
        </p>
      </form>
    </Ventana>
  );
}
