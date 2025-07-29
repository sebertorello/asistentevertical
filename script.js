// — Esperamos a que el DOM cargue — 
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formEvento");
  const out  = document.getElementById("respuesta");
  if (!form) return;

  // ← TU URL de web‐app desplegada (sin espacios extra)
  const URL = "https://script.google.com/macros/s/AKfycbwx-0lDuVy7AGr3c6QU6RQ_tcuVfuKHMNBPzbNsprU9A5Gact-19mnyDACzYYOZdfr7/exec";

  /**
   * JSONP para verificar si ya existe un evento en esa fecha (dd/MM/yyyy)
   * @param {string} fechaISO – "YYYY-MM-DD"
   * @returns {Promise<boolean>}
   */
  function verificarFecha(fechaISO) {
    return new Promise(resolve => {
      const cb = "cb_" + Date.now();
      const s  = document.createElement("script");
      const t  = setTimeout(() => {
        delete window[cb];
        s.remove();
        resolve(false);
      }, 6000);

      window[cb] = data => {
        clearTimeout(t);
        delete window[cb];
        s.remove();
        resolve(data.existe === true);
      };

      s.src = `${URL}?accion=verificar&callback=${cb}` +
              `&fecha=${encodeURIComponent(fechaISO)}&_=${Date.now()}`;
      document.body.appendChild(s);
    });
  }

  /**
   * Envía los datos por POST
   * @param {Object} datos – incluye {accion, nombre, tipo, fecha, hora, precio, pago, estado, contacto, salon}
   */
  function guardarEvento(datos) {
    return fetch(URL, {
      method:  "POST",
      mode:    "no-cors",  // evita errores de CORS
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body:    JSON.stringify(datos)
    });
  }

  // — Al enviar el formulario —
  form.addEventListener("submit", async e => {
    e.preventDefault();
    out.textContent = "⏳ Procesando…";

    // 1) Leemos y normalizamos cada campo
    const nombreInput  = form.nombre.value.trim();
    const nombre       = nombreInput.toUpperCase();      // siempre MAYÚSCULAS
    const tipo         = form.tipo.value;
    const fecha        = form.fecha.value;                // "YYYY-MM-DD"
    const horaCampo    = form.hora.value.trim();
    const hora         = horaCampo || "13:00";            // default 13:00
    const precioInput  = form.precio.value.trim();
    const pagoInput    = form.pago.value.trim();
    const estado       = form.estado.value.trim() || "Pendiente";
    const contacto     = form.contacto.value.trim() || "0000000000";
    const salonInput   = form.salon.value.trim();
    const salon        = salonInput || "";                // vacío si no hay

    // 2) Preparamos el objeto a enviar
    const datos = {
      accion:   "create",
      nombre,
      tipo,
      fecha,
      hora,
      precio:   precioInput,  // "" si dejaste vacío
      pago:     pagoInput,    // "" si dejaste vacío
      estado,
      contacto,
      salon
    };

    try {
      // 3) (Opcional) verificar solapamiento
      const existe = await verificarFecha(fecha);
      if (existe) {
        const ok = confirm(
          "¡Ese día ya tenés un evento programado!\n" +
          "¿Deseás guardarlo igual?"
        );
        if (!ok) {
          out.textContent = "⏹️ Operación cancelada.";
          return;
        }
      }

      // 4) Enviamos al Apps Script
      await guardarEvento(datos);

      // 5) Mensaje de éxito
      out.textContent = existe
        ? "✅ Evento guardado. ⚠️ Ya había otro evento ese día."
        : "✅ Evento guardado correctamente.";
      form.reset();

    } catch (err) {
      console.error(err);
      // Si falla la verificación, igual guardamos
      await guardarEvento(datos);
      out.textContent = "✅ Evento guardado (con incidencia en verificación).";
      form.reset();
    }
  });
});
