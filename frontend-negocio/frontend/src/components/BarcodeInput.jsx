import { useEffect, useRef, useState } from "react";

const isTextEntry = (el) => {
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
};

export default function BarcodeInput({
  onScan,
  placeholder = "Escanear código de barras…",
  lockFocus = false,     // ✅ si true, NO deja que el foco se vaya
  autoFocus = true,
  style,
}) {
  const ref = useRef(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const tryRefocus = () => {
    setTimeout(() => {
      if (lockFocus) {
        ref.current?.focus();
        return;
      }

      const active = document.activeElement;

      // Si el usuario está escribiendo en otro input, no robamos foco
      if (active && active !== ref.current && isTextEntry(active)) return;

      ref.current?.focus();
    }, 0);
  };

  return (
    <input
      ref={ref}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={tryRefocus}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          // ✅ CLAVE: evitar submit del form
          e.preventDefault();
          e.stopPropagation();

          const code = value.trim();
          if (code) onScan?.(code);
          setValue("");
        }
      }}
      style={{ width: 280, ...(style || {}) }}
    />
  );
}
