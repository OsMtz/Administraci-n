export const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString(undefined, { style: "currency", currency: "MXN" });
};

export const buildTicketHtml = (ticket, opts = {}) => {
  const { autoPrint = true } = opts;
  const safe = (v) => String(v ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const clinicName = "ClinicaMed";
  const clinicLine = "Ticket de consulta";
  const now = new Date().toLocaleString();

  const pacienteNombre = ticket?.paciente_nombre || "-";
  const pacienteDni = ticket?.paciente_dni || "-";
  const doctor = ticket?.medico_usuario || "-";
  const fechaCita = ticket?.cita_fecha || "-";
  const horaCita = ticket?.cita_hora || "-";

  const idFactura = ticket?.id_factura ? `#${ticket.id_factura}` : "-";
  const monto = formatMoney(ticket?.monto);
  const metodo = ticket?.metodo_pago || "-";
  const fechaPago = ticket?.fecha_pago || "-";

  const notas = ticket?.notas ? safe(ticket.notas) : "";

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Ticket ${safe(idFactura)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 14px; }
        .ticket { width: 320px; margin: 0 auto; }
        .center { text-align: center; }
        h1 { font-size: 18px; margin: 0; }
        .sub { font-size: 12px; margin-top: 4px; color: #444; }
        .sep { border-top: 1px dashed #999; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin: 6px 0; }
        .label { color: #555; }
        .value { font-weight: 600; text-align: right; }
        .small { font-size: 11px; color: #555; }
        @media print {
          body { padding: 0; }
          .ticket { width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="center">
          <h1>${safe(clinicName)}</h1>
          <div class="sub">${safe(clinicLine)}</div>
          <div class="small">${safe(now)}</div>
        </div>
        <div class="sep"></div>
        <div class="row"><div class="label">Factura</div><div class="value">${safe(idFactura)}</div></div>
        <div class="row"><div class="label">Paciente</div><div class="value">${safe(pacienteNombre)}</div></div>
        <div class="row"><div class="label">DNI</div><div class="value">${safe(pacienteDni)}</div></div>
        <div class="row"><div class="label">Doctor</div><div class="value">${safe(doctor)}</div></div>
        <div class="row"><div class="label">Cita</div><div class="value">${safe(fechaCita)} ${safe(horaCita)}</div></div>
        <div class="sep"></div>
        <div class="row"><div class="label">Monto</div><div class="value">${safe(monto)}</div></div>
        <div class="row"><div class="label">Metodo</div><div class="value">${safe(metodo)}</div></div>
        <div class="row"><div class="label">Fecha pago</div><div class="value">${safe(fechaPago)}</div></div>
        ${notas ? `<div class="sep"></div><div class="small"><strong>Notas:</strong> ${notas}</div>` : ""}
        <div class="sep"></div>
        <div class="center small">Gracias por su preferencia.</div>
      </div>
      ${
        autoPrint
          ? `<script>
        window.onload = () => {
          window.focus();
          window.print();
        };
      </script>`
          : ""
      }
    </body>
  </html>`;
};
