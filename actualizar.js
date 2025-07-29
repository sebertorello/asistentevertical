// Esperamos a que el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  // 1) Configuramos URL y referencias a elementos del DOM
  const URL      = "https://script.google.com/macros/s/AKfycbwx-0lDuVy7AGr3c6QU6RQ_tcuVfuKHMNBPzbNsprU9A5Gact-19mnyDACzYYOZdfr7/exec";
  const sel      = document.getElementById("selEvento");  // <select> de eventos
  const acciones = document.getElementById("acciones");   // contenedor de botones
  const detalle  = document.getElementById("detalle");    // sección de datos del evento
  let eventos    = [];                                    // aquí guardaremos el array de eventos

  // 2) Función para obtener la lista de eventos vía JSONP (accion=list)
  function loadList() {
    return new Promise(res => {
      sel.innerHTML         = `<option value="">-- Busca y selecciona --</option>`;
      detalle.innerHTML     = "";
      acciones.style.display = "none";

      const cbName = "cbU" + Date.now();
      window[cbName] = payload => {
        delete window[cbName];
        document.body.removeChild(scriptTag);
        eventos = payload.datos;
        eventos.forEach((e,i) => e._fila = i + 2); // fila real en la hoja
        fillSelect();
        res();
      };

      const scriptTag = document.createElement("script");
      scriptTag.src = `${URL}?accion=list&callback=${cbName}&_=${Date.now()}`;
      document.body.appendChild(scriptTag);
    });
  }

  // 3) Rellena el <select> con opciones "Nombre – Tipo (dd/MM/yyyy)"
  function fillSelect() {
    eventos.forEach((e, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.text  = `${e.nombre} – ${e.tipo} (${e.fecha})`;
      sel.appendChild(opt);
    });
  }

  // 4) Cuando cambias la opción, mostramos datos y habilitamos botones
  sel.addEventListener("change", () => {
    const idx = sel.value;
    if (idx === "") {
      acciones.style.display = "none";
      detalle.innerHTML = "";
      return;
    }

    const e = eventos[idx];
    acciones.style.display = "flex";

    // ── Cálculo de saldo con fallback ──
    const precioNum = Number(e.precio) || 0;
    const pagoNum   = Number(e.pago)   || 0;
    const saldoVal  = (e.saldo !== undefined && e.saldo !== "")
      ? e.saldo
      : (precioNum - pagoNum);

    detalle.innerHTML = `
      <p><strong>Fecha:</strong> ${e.fecha}</p>
      <p><strong>Hora:</strong> ${e.hora}</p>
      <p><strong>Precio total:</strong> ${e.precio}</p>
      <p><strong>Pago parcial:</strong> ${e.pago}</p>
      <p><strong>Saldo restante:</strong> ${saldoVal}</p>
      <p><strong>Estado:</strong> ${e.estado}</p>
      <p><strong>Contacto:</strong> ${e.contacto}</p>
      <p><strong>Salón:</strong> ${e.salon || ""}</p>
    `;
  });

  // 5) Asociamos el resto de botones a columnas (salvo btnPago, btnContacto y btnSalon)
  const colMap = {
    btnPrecio: 5,  // columna 5 = Precio total
    btnEstado: 12  // columna 12 = Estado del presupuesto
  };

  // 6) Recorremos todos los botones de acción
  document.querySelectorAll(".accion").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = sel.value;
      if (!idx) return;
      const e = eventos[idx];

      // — ELIMINAR EVENTO —
      if (btn.id === "btnEliminar") {
        if (!confirm("¿Eliminar este evento de hoja y calendario?")) return;
        await fetch(URL, {
          method: "POST",
          mode:   "no-cors",
          headers:{ "Content-Type":"text/plain;charset=utf-8" },
          body:   JSON.stringify({ accion:"delete", row:e._fila })
        });
        alert("✅ Evento eliminado.");
        return loadList();
      }

      // — AGREGAR PAGO PARCIAL —
      if (btn.id === "btnPago") {
        let montoStr = prompt("Ingrese monto de pago parcial a agregar:", "0");
        if (montoStr === null) return;
        montoStr = montoStr.trim();
        if (!/^\d+(\.\d{1,2})?$/.test(montoStr)) {
          alert("❌ Por favor ingrese un número válido.");
          return;
        }
        const montoNuevo = parseFloat(montoStr);
        const pagoActual = Number(e.pago) || 0;
        const pagoTotal  = pagoActual + montoNuevo;

        const hoy = new Date();
        const fechaHoy = [
          String(hoy.getDate()).padStart(2,"0"),
          String(hoy.getMonth()+1).padStart(2,"0"),
          hoy.getFullYear()
        ].join("/");

        // Solo actualizamos pago parcial (F) y fecha último pago (G)
        await fetch(URL, {
          method: "POST",
          mode:   "no-cors",
          headers:{ "Content-Type":"text/plain;charset=utf-8" },
          body:   JSON.stringify({
            accion: "update",
            row:    e._fila,
            data:   {
              6: pagoTotal,   // F
              7: fechaHoy     // G
            }
          })
        });
        alert("✅ Pago agregado y fecha actualizada.");
        return loadList();
      }

      // — DIVISIÓN DE CUENTAS —
      if (btn.id === "btnDivision") {
        const pct = prompt("Porcentaje para Mauri (0–100):", "50");
        if (pct === null) return;
        await fetch(URL, {
          method: "POST",
          mode:   "no-cors",
          headers:{ "Content-Type":"text/plain;charset=utf-8" },
          body:   JSON.stringify({ accion:"division", row:e._fila, porcentaje:Number(pct) })
        });
        alert("✅ División aplicada.");
        return loadList();
      }

      // — AGREGAR N° DE CONTACTO —
      if (btn.id === "btnContacto") {
        let contactStr = prompt("Ingrese número de contacto:", e.contacto || "");
        if (contactStr === null) return;
        contactStr = contactStr.trim();
        if (!/^\d+$/.test(contactStr)) {
          alert("❌ Ingrese solo dígitos.");
          return;
        }
        await fetch(URL, {
          method: "POST",
          mode:   "no-cors",
          headers:{ "Content-Type":"text/plain;charset=utf-8" },
          body:   JSON.stringify({
            accion:"update",
            row:e._fila,
            data:{ 13: contactStr }  // M = col 13
          })
        });
        alert("✅ Contacto actualizado.");
        return loadList();
      }

      // — AGREGAR SALÓN —
      if (btn.id === "btnSalon") {
        let salonStr = prompt("Ingrese Salón del evento:", e.salon || "");
        if (salonStr === null) return;
        salonStr = salonStr.trim();
        await fetch(URL, {
          method: "POST",
          mode:   "no-cors",
          headers:{ "Content-Type":"text/plain;charset=utf-8" },
          body:   JSON.stringify({
            accion:"update",
            row:e._fila,
            data:{ 15: salonStr }    // O = col 15
          })
        });
        alert("✅ Salón actualizado.");
        return loadList();
      }

      // — ACTUALIZAR PRECIO / ESTADO —
      if (colMap[btn.id]) {
        let nuevo;
        if (btn.id === "btnEstado") {
          nuevo = prompt("Nuevo estado (Pendiente/Aprobado/Rechazado):", e.estado);
        } else {
          nuevo = prompt("Ingrese nuevo precio total:", e.precio);
        }
        if (nuevo === null) return;
        await fetch(URL, {
          method: "POST",
          mode:   "no-cors",
          headers:{ "Content-Type":"text/plain;charset=utf-8" },
          body:   JSON.stringify({
            accion: "update",
            row:    e._fila,
            data:   { [colMap[btn.id]]: nuevo }
          })
        });
        alert("✅ Actualización guardada.");
        return loadList();
      }

      // — DESHACER ÚLTIMO CAMBIO —
      if (btn.id === "btnRevert") {
        const cb = "cbH" + Date.now();
        window[cb] = payload => {
          delete window[cb];
          document.body.removeChild(scriptTagH);
          if (!payload) { alert("No hay cambios para revertir."); return; }
          if (!confirm(`Revertir columna ${payload.col} a "${payload.prevValue}"?`)) return;
          fetch(URL, {
            method: "POST",
            mode:   "no-cors",
            headers:{ "Content-Type":"text/plain;charset=utf-8" },
            body:   JSON.stringify({
              accion: "revert",
              row:    e._fila,
              col:    payload.col,
              valor:  payload.prevValue
            })
          }).then(() => {
            alert("✅ Cambio revertido.");
            loadList();
          });
        };
        const scriptTagH = document.createElement("script");
        scriptTagH.src = `${URL}?accion=lasthist&row=${e._fila}&callback=${cb}&_=${Date.now()}`;
        document.body.appendChild(scriptTagH);
      }
    });
  });

  // 7) Arrancamos cargando la lista
  loadList();
});
