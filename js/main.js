// Elimina los datos de ejemplo y la función actualizarDatos

let telares = [];
let ocurrenciasData = []; // Nueva variable para almacenar los datos de Data2.xlsx
let turnoSeleccionado = "todos";
let tipoSeleccionado = "todos";
let busquedaIds = []; // Nueva variable para almacenar los IDs de búsqueda
let primeraFecha = "";

// Función para aplicar filtros en secuencia
function aplicarFiltros() {
  let telaresFiltrados = telares;

  // Primero aplicar filtro de turno
  if (turnoSeleccionado !== "todos") {
    telaresFiltrados = telaresFiltrados.filter(
      (telar) => String(telar.turno).trim() === turnoSeleccionado
    );
  }


  // Luego aplicar filtro de tipo sobre el resultado anterior
  if (tipoSeleccionado !== "todos") {
    switch (tipoSeleccionado) {
      case "eficiencia_baja":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.eficIp) < 87
        );
        break;
      case "eficiencia_alta":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.eficIp) >= 87
        );
        break;
      case "cmpx_alto":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.cmpxTip) + Number(telar.cmpxUp) > 10
        );
        break;
      case "cmpx_bajo":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.cmpxTip) + Number(telar.cmpxUp) <= 10
        );
        break;
      case "con_ocurrencias":
        if (turnoSeleccionado !== "promedio") {
          telaresFiltrados = telaresFiltrados.filter((telar) => {
            const hasOcurrencias = ocurrenciasData.some(
              (item) =>
                String(item.Telar) === String(telar.id) &&
                String(item.Turno) === String(telar.turno)
            );
            return hasOcurrencias;
          });
        }
        break;
    }
  }

  // Finalmente, aplicar filtro de búsqueda por ID
  if (busquedaIds.length > 0) {
    telaresFiltrados = telaresFiltrados.filter((telar) =>
      busquedaIds.includes(String(telar.id))
    );
  }

  return telaresFiltrados;
}

// Función para resetear filtros
function resetearFiltros() {
  turnoSeleccionado = "todos";
  tipoSeleccionado = "todos";

  // Resetear los selects en el HTML
  const filtroTurno = document.getElementById("filtroTurno");
  const filtroTipo = document.getElementById("filtroTipo");

  if (filtroTurno) filtroTurno.value = "todos";
  if (filtroTipo) filtroTipo.value = "todos";
}

function renderTelares() {
  const grid = document.getElementById("telaresGrid");
  grid.innerHTML = "";

  // Aplicar filtros en secuencia
  let telaresFiltrados = aplicarFiltros();

  telaresFiltrados.forEach((telar) => {
    const telarElement = document.createElement("div");
    telarElement.className = "telar";
    const telarOcurrencias = ocurrenciasData.filter(
      (item) =>
        String(item.Telar) === String(telar.id) &&
        String(item.Turno) === String(telar.turno)
    );

    let ocurrenciasHtml = "";
    if (
      tipoSeleccionado === "con_ocurrencias" &&
      turnoSeleccionado !== "promedio" &&
      telarOcurrencias.length > 0
    ) {
      ocurrenciasHtml = `
        <div class="ocurrencias-info">
          <h4>Ocurrencias:</h4>
          ${telarOcurrencias
            .map(
              (oc) =>
                `<p><strong>Ocurrencia:</strong> ${oc.Ocurrencia} - <strong>Tiempo:</strong> ${Number(oc.Tiempo).toFixed(2)}</p>`
            )
            .join("")}
        </div>
      `;
    }

    telarElement.innerHTML = `
      <div class="telar-status">
        ${getStatusIndicators(telar)}
      </div>
      <div class="telar-header">
          <div class="telar-id">${telar.id}</div>
          <div class="telar-rpm">R.P.M. ${telar.rpm}</div>
      </div>
      <div class="telar-info">
          <div class="info-item">
              <div class="info-label">ARTICULO</div>
              <div class="info-value">${telar.articulo}</div>
          </div>
          <div class="info-item">
              <div class="info-label">DISEÑO</div>
              <div class="info-value">${telar.diseño}</div>
          </div>
      </div>
      <div class="parametros">
          <div class="parametro cmpx-tip">
              <div>CMPX T/P</div>
              <div>${Number(telar.cmpxTip).toFixed(2)}</div>
          </div>
          <div class="parametro cmpx-up">
              <div>CMPX U/P</div>
              <div>${Number(telar.cmpxUp).toFixed(2)}</div>
          </div>
          <div class="parametro efic-ip">
              <div>EFIC. /P</div>
              <div>${Number(telar.eficIp).toFixed(2)}</div>
          </div>
      </div>
      <div class="turno-indicator">${telar.turno}</div>
      ${ocurrenciasHtml}
    `;
    grid.appendChild(telarElement);
  });
}

// Cargar los datos de Data.xlsx desde el servidor
function cargarExcelDesdeServidor() {
  fetch("Data.xlsx")
  .then((response) => response.arrayBuffer())
  .then((data) => {
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);

    telares = [];
    primeraFecha = ""; // Reinicia por si recargas
    json.forEach((row, idx) => {
      if (!primeraFecha && row.Fecha) {
        primeraFecha = row.Fecha;
      }
      telares.push({
        id: row.Telar,
        turno: row.Turno,
        articulo: row.Articulo,
        diseño: row.Diseño || "",
        rpm: row.VelocidadTelar || 0,
        cmpxTip: row.TiempoparoManual || row["CmpxParoxTrama"] || 0,
        cmpxUp: row.TiempoparoxTrama || row["CmpxParoxUrdimbre"] || 0,
        eficIp: row.EficienciaMaqTiempo || 0,
      });
    });
    renderFechaEnControles();
    renderTelares();
  })
  .catch((err) => {
    console.error("No se pudo cargar Data.xlsx:", err);
  });
}



function cargarOcurrenciasDesdeServidor() {
  fetch("Data2.xlsx")
    .then((response) => response.arrayBuffer())
    .then((data) => {
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      ocurrenciasData = XLSX.utils.sheet_to_json(sheet);
      // No renderizar aquí, se hará cuando se apliquen los filtros
    })
    .catch((err) => {
      console.error("No se pudo cargar Data2.xlsx:", err);
    });
}

// Muestra la fecha en el div de controles
function renderFechaEnControles() {
  const fechaDiv = document.getElementById("fechaInfo");
  if (fechaDiv) {
    let fechaFormateada = "";
    if (primeraFecha) {
      if (!isNaN(primeraFecha)) {
        fechaFormateada = excelDateToYMD(Number(primeraFecha));
      } else {
        fechaFormateada = primeraFecha;
      }
    }
    fechaDiv.textContent = fechaFormateada ? `Fecha: ${fechaFormateada}` : "";
  }
}

// Llama a las funciones al iniciar
cargarExcelDesdeServidor();
cargarOcurrenciasDesdeServidor();

// Inicializar la aplicación
renderTelares();

document.addEventListener("DOMContentLoaded", function () {
  const filtroTurno = document.getElementById("filtroTurno");
  const filtroTipo = document.getElementById("filtroTipo");
  const busquedaTelar = document.getElementById("busquedaTelar");
  const btnImprimir = document.getElementById("btnImprimir");

  if (filtroTurno) {
    filtroTurno.addEventListener("change", function () {
      turnoSeleccionado = this.value;
      if (this.value === "promedio") {
        renderPromedioPorTelar();
      } else {
        renderTelares();
      }
    });
  }

  if (filtroTipo) {
    filtroTipo.addEventListener("change", function () {
      tipoSeleccionado = this.value;
      // Verificar si está en modo promedio o normal
      if (filtroTurno && filtroTurno.value === "promedio") {
        renderPromedioPorTelar();
      } else {
        renderTelares();
      }
    });
  }

  if (busquedaTelar) {
    busquedaTelar.addEventListener("input", function () {
      const valor = this.value.trim();
      if (valor.length === 0) {
        busquedaIds = []; // Limpiar IDs de búsqueda si el campo está vacío
      } else {
        busquedaIds = valor.split(",").map((id) => id.trim()); // Actualizar IDs de búsqueda
      }

      // Renderizar según el filtro actual (promedio o normal)
      if (filtroTurno && filtroTurno.value === "promedio") {
        renderPromedioPorTelar();
      } else {
        renderTelares();
      }
    });
  }

  if (btnImprimir) {
    btnImprimir.onclick = function () {
      const grid = document.getElementById("telaresGrid");
      const ventana = window.open("", "", "width=900,height=700");
      ventana.document.write(`
        <html>
          <head>
            <title>Imprimir Telares</title>
            <link rel="stylesheet" href="css/styles.css" />
            <style>
              body { background: #f8fafc; margin: 0; }
              .container { box-shadow: none; }
            </style>
          </head>
          <body>
            <div class="telares-grid">
              ${grid.innerHTML}
            </div>
          </body>
        </html>
      `);
      ventana.document.close();
      // Espera a que la hoja de estilos se cargue antes de imprimir
      ventana.onload = function () {
        ventana.focus();
        ventana.print();
        ventana.close();
      };
    };
  }
});

function renderPromedioPorTelar() {
  const grid = document.getElementById("telaresGrid");
  grid.innerHTML = "";

  // Agrupar por id de telar
  const agrupados = {};
  telares.forEach((telar) => {
    if (!agrupados[telar.id]) agrupados[telar.id] = [];
    agrupados[telar.id].push(telar);
  });

  // Crear array de promedios
  const telaresPromedio = [];
  Object.keys(agrupados).forEach((id) => {
    const grupo = agrupados[id];
    // Calcular promedios
    const cmpxTipProm =
      grupo.reduce((s, t) => s + Number(t.cmpxTip), 0) / grupo.length;
    const cmpxUpProm =
      grupo.reduce((s, t) => s + Number(t.cmpxUp), 0) / grupo.length;
    const eficIpProm =
      grupo.reduce((s, t) => s + Number(t.eficIp), 0) / grupo.length;

    // Usar datos del primer registro para mostrar info general
    const telar = grupo[0];

    // Crear objeto con promedios
    telaresPromedio.push({
      id: telar.id,
      turno: telar.turno,
      articulo: telar.articulo,
      diseño: telar.diseño,
      rpm: telar.rpm,
      cmpxTip: cmpxTipProm,
      cmpxUp: cmpxUpProm,
      eficIp: eficIpProm,
    });
  });

  // Aplicar filtro de tipo a los promedios
  let telaresFiltrados = telaresPromedio;
  if (tipoSeleccionado !== "todos") {
    switch (tipoSeleccionado) {
      case "eficiencia_baja":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.eficIp) < 87
        );
        break;
      case "eficiencia_alta":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.eficIp) >= 87
        );
        break;
      case "cmpx_alto":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.cmpxTip) + Number(telar.cmpxUp) > 10
        );
        break;
      case "cmpx_bajo":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.cmpxTip) + Number(telar.cmpxUp) <= 10
        );
        break;
      case "con_ocurrencias":
        // El filtro de ocurrencias no aplica en la vista de promedio
        break;
    }
  }

  // Aplicar filtro de búsqueda por ID a los promedios
  if (busquedaIds.length > 0) {
    telaresFiltrados = telaresFiltrados.filter((telar) =>
      busquedaIds.includes(String(telar.id))
    );
  }

  telaresFiltrados.forEach((telar) => {
    const telarElement = document.createElement("div");
    telarElement.className = "telar";
    telarElement.innerHTML = `
      <div class="telar-status">
        ${getStatusIndicatorsPromedio(
          telar.eficIp,
          telar.cmpxTip,
          telar.cmpxUp
        )}
      </div>
      <div class="telar-header">
          <div class="telar-id">${telar.id}</div>
          <div class="telar-rpm">R.P.M. ${telar.rpm}</div>
      </div>
      <div class="telar-info">
          <div class="info-item">
              <div class="info-label">ARTICULO</div>
              <div class="info-value">${telar.articulo}</div>
          </div>
          <div class="info-item">
              <div class="info-label">DISEÑO</div>
              <div class="info-value">${telar.diseño}</div>
          </div>
      </div>
      <div class="parametros">
          <div class="parametro cmpx-tip">
              <div>CMPX T/P</div>
              <div>${Number(telar.cmpxTip).toFixed(2)}</div>
          </div>
          <div class="parametro cmpx-up">
              <div>CMPX U/P</div>
              <div>${Number(telar.cmpxUp).toFixed(2)}</div>
          </div>
          <div class="parametro efic-ip">
              <div>EFIC. /P</div>
              <div>${Number(telar.eficIp).toFixed(2)}</div>
          </div>
      </div>
    `;
    grid.appendChild(telarElement);
  });
}

function getStatusIndicators(telar) {
  const indicators = [];
  if (Number(telar.eficIp) < 87) {
    indicators.push(
      '<span class="telar-status-indicator status-eficiencia-baja" title="Eficiencia baja"></span>'
    );
  } else {
    indicators.push(
      '<span class="telar-status-indicator status-eficiencia-alta" title="Eficiencia alta"></span>'
    );
  }
  if (Number(telar.cmpxTip) + Number(telar.cmpxUp) > 10) {
    indicators.push(
      '<span class="telar-status-indicator status-cmpx-alto" title="CMPX alto"></span>'
    );
  } else {
    indicators.push(
      '<span class="telar-status-indicator status-cmpx-bajo" title="CMPX bajo"></span>'
    );
  }
  return indicators.join("");
}

function getStatusIndicatorsPromedio(eficIpProm, cmpxTipProm, cmpxUpProm) {
  const indicators = [];
  if (eficIpProm < 87) {
    indicators.push(
      '<span class="telar-status-indicator status-eficiencia-baja" title="Eficiencia baja"></span>'
    );
  } else {
    indicators.push(
      '<span class="telar-status-indicator status-eficiencia-alta" title="Eficiencia alta"></span>'
    );
  }
  if (cmpxTipProm + cmpxUpProm > 10) {
    indicators.push(
      '<span class="telar-status-indicator status-cmpx-alto" title="CMPX alto"></span>'
    );
  } else {
    indicators.push(
      '<span class="telar-status-indicator status-cmpx-bajo" title="CMPX bajo"></span>'
    );
  }
  return indicators.join("");
}

function excelDateToYMD(serial) {
  // Excel date serial to JS Date
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const days = Math.floor(serial);
  const ms = days * 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + ms);
  // Formato YYYYMMDD
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}
