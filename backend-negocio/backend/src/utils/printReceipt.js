// src/utils/printReceipt.js

const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const money = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
    Number(n || 0)
  );

// widthMm: 80 o 58
export function buildReceiptHtml({
  storeName = "Mi Negocio",
  storeLine2 = "",
  storeLine3 = "",
  saleId = "",
  cashier = "",
  date = new Date(),
  items = [], // [{ name, qty, price }]
  total = 0,
  widthMm = 80,
  autoPrint = false, // ✅ NUEVO: por defecto NO imprime solo
  autoClose = false, // ✅ NUEVO: opcional
}) {
  const dt = new Date(date);
  const when = `${dt.toLocaleDateString("es-AR")} ${dt
    .toLocaleTimeString("es-AR")
    .slice(0, 5)}`;

  const lines = items
    .map((it) => {
      const name = esc(it.name);
      const qty = Number(it.qty || 0);
      const price = Number(it.price || 0);
      const sub = qty * price;

      return `
        <div class="row">
          <div class="name">${name}</div>
          <div class="qty">${qty} x ${money(price)}</div>
          <div class="sub">${money(sub)}</div>
        </div>
      `;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ticket</title>
  <style>
    @page { size: ${widthMm}mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body {
      width: ${widthMm}mm;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      color: #000;
    }
    .wrap { padding: 6mm 4mm; }
    .center { text-align: center; }
    .muted { opacity: 0.75; }
    .sep { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: grid; grid-template-columns: 1fr; gap: 2px; margin: 6px 0; }
    .name { font-weight: 700; }
    .qty { display: flex; justify-content: space-between; }
    .sub { text-align: right; font-weight: 700; }
    .tot { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; margin-top: 6px; }
    .small { font-size: 11px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="center">
      <div style="font-weight:900; font-size:14px;">${esc(storeName)}</div>
      ${storeLine2 ? `<div class="small">${esc(storeLine2)}</div>` : ""}
      ${storeLine3 ? `<div class="small">${esc(storeLine3)}</div>` : ""}
    </div>

    <div class="sep"></div>

    <div class="small">
      <div><b>Fecha:</b> ${esc(when)}</div>
      ${cashier ? `<div><b>Cajero:</b> ${esc(cashier)}</div>` : ""}
      ${saleId ? `<div><b>Venta:</b> ${esc(saleId)}</div>` : ""}
    </div>

    <div class="sep"></div>

    ${lines}

    <div class="sep"></div>

    <div class="tot">
      <div>TOTAL</div>
      <div>${money(total)}</div>
    </div>

    <div class="sep"></div>

    <div class="center muted small">
      Gracias por su compra
    </div>
  </div>

  <script>
    // ✅ Solo imprime si autoPrint = true
    window.onload = () => {
      const autoPrint = ${autoPrint ? "true" : "false"};
      const autoClose = ${autoClose ? "true" : "false"};
      if (autoPrint) {
        setTimeout(() => window.print(), 50);
        if (autoClose) setTimeout(() => window.close(), 200);
      }
    };
  </script>
</body>
</html>`;
}

export function printReceipt(html, opts = {}) {
  // opts: { autoPrint?: boolean, autoClose?: boolean }
  const w = window.open("", "_blank", "width=420,height=650");
  if (!w) {
    alert("El navegador bloqueó la ventana de impresión. Permití popups para imprimir.");
    return null;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();

  // ✅ si querés imprimir desde el botón, lo hacés desde acá:
  const { autoPrint = false, autoClose = false } = opts;
  if (autoPrint) {
    w.onload = () => {
      try {
        w.focus();
        w.print();
        if (autoClose) setTimeout(() => w.close(), 250);
      } catch {}
    };
  }

  return w;
}
