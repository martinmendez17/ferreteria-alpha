import { useState } from "react";

/** Ícono de reemplazo cuando el producto no tiene imagen o el enlace no carga. */
function IconoGenerico() {
  return (
    <svg viewBox="0 0 120 120" width="60%" height="60%" aria-hidden="true">
      <rect x="22" y="38" width="76" height="52" rx="8" fill="#c9d1da" />
      <rect x="44" y="26" width="32" height="16" rx="5" fill="none" stroke="#9aa5b1" strokeWidth="6" />
      <rect x="22" y="56" width="76" height="6" fill="#9aa5b1" />
      <rect x="52" y="52" width="16" height="14" rx="3" fill="#1f6f8b" />
    </svg>
  );
}

export function ImagenProducto({ url, alt }: { url: string | null | undefined; alt: string }) {
  const [fallo, setFallo] = useState(false);
  if (!url || fallo) return <IconoGenerico />;
  return <img src={url} alt={alt} loading="lazy" onError={() => setFallo(true)} />;
}
