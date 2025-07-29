// Esperamos a que el DOM cargue
document.addEventListener("DOMContentLoaded", () => {
  // ← TU URL de implementación
  const URL = "https://script.google.com/macros/s/AKfycbwx-0lDuVy7AGr3c6QU6RQ_tcuVfuKHMNBPzbNsprU9A5Gact-19mnyDACzYYOZdfr7/exec";

  // Elementos del DOM
  const buscador   = document.getElementById("buscador");
  const filtroTipo = document.getElementById("filtroTipo");
  const filtroMes  = document.getElementById("filtroMes");
  const contenedor = document.getElementById("listaEventos");
  const estadoTxt  = document.getElementById("estado");

  let eventos = [];

  /**
   * 1) Carga lista de eventos via JSONP (accion=list)
   */
  function cargarEventos(){
    return new Promise(resolve => {
      const cb = "cbList_" + Date.now();
      window[cb] = data => {
        delete window[cb];
        s.remove();
        eventos = data.datos; // vienen ya en {fecha:"dd/MM/yyyy", …}
        resolve();
      };
      const s = document.createElement("script");
      s.src = `${URL}?accion=list&callback=${cb}&_=${Date.now()}`;
      document.body.appendChild(s);
    });
  }

  /**
   * 2) Formatea número con símbolo $ y puntos en miles
   */
  function formNum(n){
    return `$${Number(n||0).toLocaleString('es-AR')}`;
  }

  /**
   * 3) Renderiza las tarjetas según filtro de nombre, tipo y mes
   */
  function render(){
    const txt  = buscador.value.toUpperCase();
    const tipo = filtroTipo.value;
    const mes  = filtroMes.value;  // "08","09",…

    contenedor.innerHTML = "";

    const lista = eventos
      .filter(e => e.nombre.toUpperCase().includes(txt))
      .filter(e => !tipo || e.tipo === tipo)
      .filter(e => !mes  || e.fecha.slice(3,5) === mes)
      .sort((a,b)=> a.nombre.localeCompare(b.nombre));

    lista.forEach(e => {
      const card = document.createElement("div");
      card.className = "card";

      // Cabecera con nombre y tipo
      const head = document.createElement("div");
      head.className = "card-header";
      head.textContent = `${e.nombre} – ${e.tipo}`;

      // Cuerpo oculto inicialmente
      const body = document.createElement("div");
      body.className = "card-body";
      body.style.display = "none";
      body.innerHTML = `
        <p><strong>Fecha:</strong> ${e.fecha}</p>
        <p><strong>Hora:</strong> ${e.hora}</p>
        <p><strong>Precio total:</strong> ${formNum(e.precio)}</p>
        <p><strong>Pago parcial:</strong> ${formNum(e.pago)}</p>
        <p><strong>Saldo restante:</strong> ${formNum(e.saldo)}</p>
        <p><strong>Pago Mauri:</strong> ${formNum(e.mauri)}</p>
        <p><strong>Pago Santi:</strong> ${formNum(e.santi)}</p>
        <p><strong>Estado:</strong> ${e.estado}</p>
        <p><strong>Contacto:</strong>
          ${
            e.contacto && /^\d{10}$/.test(e.contacto)
              ? `<a href="https://wa.me/54${e.contacto}" target="_blank">${e.contacto}</a>`
              : (e.contacto || "-")
          }
        </p>
      `;

      head.addEventListener("click", () => {
        body.style.display = body.style.display === "none" ? "block" : "none";
      });

      card.append(head, body);
      contenedor.appendChild(card);
    });

    estadoTxt.textContent = `${lista.length} evento(s) mostrado(s)`;
  }

  // 4) Listeners para filtros
  buscador.addEventListener("input",  render);
  filtroTipo.addEventListener("change", render);
  filtroMes.addEventListener("change",  render);

  // 5) Carga inicial
  estadoTxt.textContent = "⏳ Cargando…";
  cargarEventos().then(() => {
    estadoTxt.textContent = "";
    render();
  });
});
