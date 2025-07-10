// Elimina los datos de ejemplo y la función actualizarDatos

let telares = [];
let turnoSeleccionado = "todos";
let primeraFecha = "";

function renderTelares() {
  const grid = document.getElementById("telaresGrid");
  grid.innerHTML = "";

  // Filtrar telares por turno seleccionado
  let telaresFiltrados = telares;
  if (turnoSeleccionado !== "todos") {
    telaresFiltrados = telares.filter(
      (telar) => String(telar.turno).trim() === turnoSeleccionado
    );
  }

  telaresFiltrados.forEach((telar) => {
    const telarElement = document.createElement("div");
    telarElement.className = "telar";
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
    `;
    grid.appendChild(telarElement);
  });
}

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
      console.error("No se pudo cargar Data.xls:", err);
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

// Llama a la función al iniciar
cargarExcelDesdeServidor();

// Inicializar la aplicación
renderTelares();

// Manejar cambio de filtro de turno
document.addEventListener("DOMContentLoaded", function () {
  const filtro = document.getElementById("filtroTurno");
  if (filtro) {
    filtro.addEventListener("change", function () {
      if (this.value === "promedio") {
        renderPromedioPorTelar();
      } else if (this.value === "eficiencia_baja") {
        renderEficienciaBaja();
      } else if (this.value === "eficiencia_alta") {
        renderEficienciaAlta();
      } else if (this.value === "cmpx_alto") {
        renderCmpxAlto();
      } else if (this.value === "cmpx_bajo") {
        renderCmpxBajo();
      } else {
        turnoSeleccionado = this.value;
        renderTelares();
      }
    });
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

    const telarElement = document.createElement("div");
    telarElement.className = "telar";
    telarElement.innerHTML = `
      <div class="telar-status">
        ${getStatusIndicatorsPromedio(eficIpProm, cmpxTipProm, cmpxUpProm)}
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
              <div>${cmpxTipProm.toFixed(2)}</div>
          </div>
          <div class="parametro cmpx-up">
              <div>CMPX U/P</div>
              <div>${cmpxUpProm.toFixed(2)}</div>
          </div>
          <div class="parametro efic-ip">
              <div>EFIC. /P</div>
              <div>${eficIpProm.toFixed(2)}</div>
          </div>
      </div>
    `;
    grid.appendChild(telarElement);
  });
}

// Nueva función para mostrar solo telares con eficIp < 87
function renderEficienciaBaja() {
  const grid = document.getElementById("telaresGrid");
  grid.innerHTML = "";
  const telaresFiltrados = telares.filter((telar) => Number(telar.eficIp) < 87);
  telaresFiltrados.forEach((telar) => {
    const telarElement = document.createElement("div");
    telarElement.className = "telar";
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
    `;
    grid.appendChild(telarElement);
  });
}

// Nueva función para mostrar solo telares con eficIp >= 87
function renderEficienciaAlta() {
  const grid = document.getElementById("telaresGrid");
  grid.innerHTML = "";
  const telaresFiltrados = telares.filter(
    (telar) => Number(telar.eficIp) >= 87
  );
  telaresFiltrados.forEach((telar) => {
    const telarElement = document.createElement("div");
    telarElement.className = "telar";
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
    `;
    grid.appendChild(telarElement);
  });
}

// Nueva función para mostrar solo telares con cmpxTip + cmpxUp > 10
function renderCmpxAlto() {
  const grid = document.getElementById("telaresGrid");
  grid.innerHTML = "";
  const telaresFiltrados = telares.filter(
    (telar) => Number(telar.cmpxTip) + Number(telar.cmpxUp) > 10
  );
  telaresFiltrados.forEach((telar) => {
    const telarElement = document.createElement("div");
    telarElement.className = "telar";
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
    `;
    grid.appendChild(telarElement);
  });
}

// Nueva función para mostrar solo telares con cmpxTip + cmpxUp <= 10
function renderCmpxBajo() {
  const grid = document.getElementById("telaresGrid");
  grid.innerHTML = "";
  const telaresFiltrados = telares.filter(
    (telar) => Number(telar.cmpxTip) + Number(telar.cmpxUp) <= 10
  );
  telaresFiltrados.forEach((telar) => {
    const telarElement = document.createElement("div");
    telarElement.className = "telar";
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
    `;
    grid.appendChild(telarElement);
  });
}

// Nueva función para buscar por IDs
function renderBusquedaPorId(ids) {
  const grid = document.getElementById("telaresGrid");
  grid.innerHTML = "";
  const idsBuscados = ids.map((id) => id.trim());
  const telaresFiltrados = telares.filter((telar) =>
    idsBuscados.includes(String(telar.id))
  );
  telaresFiltrados.forEach((telar) => {
    const telarElement = document.createElement("div");
    telarElement.className = "telar";
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
    `;
    grid.appendChild(telarElement);
  });
}

// Imprimir el reporte
document.addEventListener("DOMContentLoaded", function () {
  const btnImprimir = document.getElementById("btnImprimir");
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

// Evento para la barra de búsqueda
document.addEventListener("DOMContentLoaded", function () {
  const busqueda = document.getElementById("busquedaTelar");
  if (busqueda) {
    busqueda.addEventListener("input", function () {
      const valor = this.value.trim();
      if (valor.length === 0) {
        // Si está vacío, renderiza según el filtro actual
        const filtro = document.getElementById("filtroTurno").value;
        if (filtro === "promedio") {
          renderPromedioPorTelar();
        } else if (filtro === "eficiencia_baja") {
          renderEficienciaBaja();
        } else if (filtro === "cmpx_alto") {
          renderCmpxAlto();
        } else if (this.value === "cmpx_bajo") {
          renderCmpxBajo();
        }        
         else {
          turnoSeleccionado = filtro;
          renderTelares();
        }
      } else {
        // Buscar por IDs separados por coma
        const ids = valor.split(",");
        renderBusquedaPorId(ids);
      }
    });
  }
});

function getStatusIndicators(telar) {
  const indicators = [];
  if (Number(telar.eficIp) < 87) {
    indicators.push('<span class="telar-status-indicator status-eficiencia-baja" title="Eficiencia baja"></span>');
  } else {
    indicators.push('<span class="telar-status-indicator status-eficiencia-alta" title="Eficiencia alta"></span>');
  }
  if (Number(telar.cmpxTip) + Number(telar.cmpxUp) > 10) {
    indicators.push('<span class="telar-status-indicator status-cmpx-alto" title="CMPX alto"></span>');
  } else {
    indicators.push('<span class="telar-status-indicator status-cmpx-bajo" title="CMPX bajo"></span>');
  }
  return indicators.join('');
}

function getStatusIndicatorsPromedio(eficIpProm, cmpxTipProm, cmpxUpProm) {
  const indicators = [];
  if (eficIpProm < 87) {
    indicators.push('<span class="telar-status-indicator status-eficiencia-baja" title="Eficiencia baja"></span>');
  } else {
    indicators.push('<span class="telar-status-indicator status-eficiencia-alta" title="Eficiencia alta"></span>');
  }
  if (cmpxTipProm + cmpxUpProm > 10) {
    indicators.push('<span class="telar-status-indicator status-cmpx-alto" title="CMPX alto"></span>');
  } else {
    indicators.push('<span class="telar-status-indicator status-cmpx-bajo" title="CMPX bajo"></span>');
  }
  return indicators.join('');
}

function excelDateToYMD(serial) {
  // Excel date serial to JS Date
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const days = Math.floor(serial);
  const ms = days * 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + ms);
  // Formato YYYYMMDD
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
}
