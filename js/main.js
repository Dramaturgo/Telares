// =================================================================================
// Variables Globales y Estado de la Aplicación
// =================================================================================

// Almacena los datos de los telares cargados desde el archivo Excel.
let datosTelares = [];
// Almacena los datos de las ocurrencias (paros) cargados desde el archivo Excel.
let datosOcurrencias = [];
// Estado actual del filtro por turno ('todos', '1', '2', '3').
let filtroTurnoActual = "todos";
// Estado actual del filtro por tipo ('todos', 'eficiencia_baja', etc.).
let filtroTipoActual = "todos";
// Almacena los IDs de telares para la búsqueda específica.
let busquedaPorIds = [];
// Almacena los códigos de ocurrencia para la búsqueda específica.
let busquedaPorCodigosOcurrencia = [];
// Almacena la fecha del reporte extraída del archivo.
let fechaReporte = "";
// Flag para controlar si se muestra la vista de promedios.
let vistaPromedioActivada = false;

// =================================================================================
// Lógica de Procesamiento y Filtrado de Datos
// =================================================================================

/**
 * Procesa los datos crudos del archivo Excel, extrayendo la información de las hojas
 * 'DatosEstadisticos' y 'MotivosParo'.
 * @param {ArrayBuffer} data - Los datos del archivo Excel como un ArrayBuffer.
 */
function procesarDatosExcel(data) {
  const workbook = XLSX.read(data, { type: "array" });

  // --- Carga de Datos Estadísticos de Telares ---
  const nombreHojaTelares = "DatosEstadisticos";
  const hojaTelares = workbook.Sheets[nombreHojaTelares];
  const jsonTelares = XLSX.utils.sheet_to_json(hojaTelares);

  datosTelares = [];
  fechaReporte = ""; // Reiniciar la fecha en cada carga
  jsonTelares.forEach((fila) => {
    if (!fechaReporte && fila.FECHA) {
      fechaReporte = fila.FECHA;
    }
    datosTelares.push({
      id: fila.TELAR,
      turno: fila.TURNO,
      articulo: fila.ARTICULO,
      diseño: fila.DISEÑO_COMB || "",
      rpm: fila.VELOCIDAD_DE_MAQUINA || 0,
      cmpxTrama: fila.CMPX_PARO_TRAMA || 0,
      cmpxUrdimbre: fila.CMPX_PARO_URDIMBRE || 0,
      eficiencia: fila.EFIC_MAQ_TIEMPO || 0,
    });
  });

  // --- Carga de Datos de Ocurrencias (Motivos de Paro) ---
  const nombreHojaOcurrencias = "MotivosParo";
  const hojaOcurrencias = workbook.Sheets[nombreHojaOcurrencias];
  datosOcurrencias = XLSX.utils.sheet_to_json(hojaOcurrencias);

  // Una vez procesados los datos, se actualiza la interfaz.
  visualizarFechaReporte();
  actualizarVisualizacion();
}

/**
 * Aplica una serie de filtros a los datos de los telares según el estado actual
 * de los controles de la interfaz.
 * @returns {Array} Un array de telares que cumplen con todos los filtros activos.
 */
function aplicarFiltros() {
  let telaresFiltrados = datosTelares;

  // 1. Filtro por Turno
  if (filtroTurnoActual !== "todos") {
    telaresFiltrados = telaresFiltrados.filter(
      (telar) => String(telar.turno).trim() === filtroTurnoActual
    );
  }

  // 2. Filtro por Tipo (Eficiencia, CMPX, Ocurrencias)
  if (filtroTipoActual !== "todos") {
    switch (filtroTipoActual) {
      case "eficiencia_baja":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.eficiencia) < 87
        );
        break;
      case "eficiencia_alta":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.eficiencia) >= 87
        );
        break;
      case "cmpx_alto":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.cmpxTrama) + Number(telar.cmpxUrdimbre) > 10
        );
        break;
      case "cmpx_bajo":
        telaresFiltrados = telaresFiltrados.filter(
          (telar) => Number(telar.cmpxTrama) + Number(telar.cmpxUrdimbre) <= 10
        );
        break;
      case "con_ocurrencias":
        telaresFiltrados = telaresFiltrados.filter((telar) => {
          return datosOcurrencias.some(
            (ocurrencia) =>
              String(ocurrencia.TELAR) === String(telar.id) &&
              String(ocurrencia.TURNO) === String(telar.turno)
          );
        });
        break;
    }
  }

  // 3. Filtro por Búsqueda de IDs
  if (busquedaPorIds.length > 0) {
    telaresFiltrados = telaresFiltrados.filter((telar) =>
      busquedaPorIds.includes(String(telar.id))
    );
  }

  // 4. Filtro por Búsqueda de Códigos de Ocurrencia
  if (busquedaPorCodigosOcurrencia.length > 0) {
    telaresFiltrados = telaresFiltrados.filter((telar) => {
      return datosOcurrencias.some(
        (ocurrencia) =>
          String(ocurrencia.TELAR) === String(telar.id) &&
          String(ocurrencia.TURNO) === String(telar.turno) &&
          busquedaPorCodigosOcurrencia.includes(String(ocurrencia.CODIGO_PARO))
      );
    });
  }

  return telaresFiltrados;
}

// =================================================================================
// Lógica de Visualización (Render)
// =================================================================================

/**
 * Decide qué vista mostrar (normal o promedios) y llama a la función de
 * renderizado correspondiente.
 */
function actualizarVisualizacion() {
  if (vistaPromedioActivada) {
    visualizarPromedioTelares();
  } else {
    visualizarTelares();
  }
}

/**
 * Renderiza la vista estándar, mostrando una tarjeta por cada telar filtrado.
 */
function visualizarTelares() {
  const grilla = document.getElementById("grillaTelares");
  grilla.innerHTML = "";

  const telaresFiltrados = aplicarFiltros();

  telaresFiltrados.forEach((telar) => {
    const elementoTelar = document.createElement("div");
    elementoTelar.className = "tarjeta-telar";

    // Obtener ocurrencias específicas para este telar y turno
    const ocurrenciasDelTelar = datosOcurrencias.filter(
      (item) =>
        String(item.TELAR) === String(telar.id) &&
        String(item.TURNO) === String(telar.turno)
    );

    // Generar HTML para las ocurrencias si el filtro está activo
    let htmlOcurrencias = "";
    if (filtroTipoActual === "con_ocurrencias" && ocurrenciasDelTelar.length > 0) {
      htmlOcurrencias = `
        <div class="info-ocurrencias">
          <h4>Ocurrencias:</h4>
          ${ocurrenciasDelTelar
            .map(
              (oc) =>
                `<p><strong>${oc.CODIGO_PARO}:</strong> ${
                  oc.DESCRIPCION_PARO
                } - <strong>Duración:</strong> ${Number(oc.DURACION).toFixed(2)}</p>`
            )
            .join("")}
        </div>
      `;
    }

    elementoTelar.innerHTML = `
      <div class="telar-estado">
        ${obtenerIndicadoresEstado(telar)}
      </div>
      <div class="telar-encabezado">
          <div class="telar-id">${telar.id}</div>
          <div class="telar-rpm">RPM ${telar.rpm}</div>
      </div>
      <div class="telar-info">
          <div class="info-item">
              <div class="info-etiqueta">ARTICULO</div>
              <div class="info-valor">${telar.articulo}</div>
          </div>
          <div class="info-item">
              <div class="info-etiqueta">DISEÑO</div>
              <div class="info-valor">${telar.diseño}</div>
          </div>
      </div>
      <div class="parametros">
          <div class="parametro cmpx-trama">
              <div>CMPX T/P</div>
              <div>${Number(telar.cmpxTrama).toFixed(2)}</div>
          </div>
          <div class="parametro cmpx-urdimbre">
              <div>CMPX U/P</div>
              <div>${Number(telar.cmpxUrdimbre).toFixed(2)}</div>
          </div>
          <div class="parametro eficiencia">
              <div>EFIC.MAQ</div>
              <div>${Number(telar.eficiencia).toFixed(2)}</div>
          </div>
      </div>
      <div class="indicador-turno">${telar.turno}</div>
      ${htmlOcurrencias}
    `;
    grilla.appendChild(elementoTelar);
  });
}

/**
 * Calcula y renderiza la vista de promedios, agrupando los datos por ID de telar.
 */
function visualizarPromedioTelares() {
  const grilla = document.getElementById("grillaTelares");
  grilla.innerHTML = "";

  // 1. Agrupar telares por ID
  const telaresAgrupados = {};
  datosTelares.forEach((telar) => {
    if (!telaresAgrupados[telar.id]) {
      telaresAgrupados[telar.id] = [];
    }
    telaresAgrupados[telar.id].push(telar);
  });

  // 2. Calcular promedios para cada grupo
  let telaresPromedio = Object.keys(telaresAgrupados).map((id) => {
    const grupo = telaresAgrupados[id];
    const total = grupo.length;
    const cmpxTramaProm = grupo.reduce((sum, t) => sum + Number(t.cmpxTrama), 0) / total;
    const cmpxUrdimbreProm = grupo.reduce((sum, t) => sum + Number(t.cmpxUrdimbre), 0) / total;
    const eficienciaProm = grupo.reduce((sum, t) => sum + Number(t.eficiencia), 0) / total;

    return {
      id: grupo[0].id,
      articulo: grupo[0].articulo,
      diseño: grupo[0].diseño,
      rpm: grupo[0].rpm,
      cmpxTrama: cmpxTramaProm,
      cmpxUrdimbre: cmpxUrdimbreProm,
      eficiencia: eficienciaProm,
    };
  });

  // 3. Aplicar filtros a los datos promediados
  if (filtroTipoActual !== "todos") {
    switch (filtroTipoActual) {
      case "eficiencia_baja":
        telaresPromedio = telaresPromedio.filter((t) => t.eficiencia < 87);
        break;
      case "eficiencia_alta":
        telaresPromedio = telaresPromedio.filter((t) => t.eficiencia >= 87);
        break;
      case "cmpx_alto":
        telaresPromedio = telaresPromedio.filter((t) => t.cmpxTrama + t.cmpxUrdimbre > 10);
        break;
      case "cmpx_bajo":
        telaresPromedio = telaresPromedio.filter((t) => t.cmpxTrama + t.cmpxUrdimbre <= 10);
        break;
      case "con_ocurrencias":
        telaresPromedio = telaresPromedio.filter((t) =>
          datosOcurrencias.some((oc) => String(oc.TELAR) === String(t.id))
        );
        break;
    }
  }

  if (busquedaPorIds.length > 0) {
    telaresPromedio = telaresPromedio.filter((t) => busquedaPorIds.includes(String(t.id)));
  }

  if (busquedaPorCodigosOcurrencia.length > 0) {
    telaresPromedio = telaresPromedio.filter((t) =>
      datosOcurrencias.some(
        (oc) =>
          String(oc.TELAR) === String(t.id) &&
          busquedaPorCodigosOcurrencia.includes(String(oc.CODIGO_PARO))
      )
    );
  }

  // 4. Renderizar las tarjetas de promedios
  telaresPromedio.forEach((telar) => {
    const elementoTelar = document.createElement("div");
    elementoTelar.className = "tarjeta-telar";
    elementoTelar.innerHTML = `
      <div class="telar-estado">
        ${obtenerIndicadoresEstado(telar)}
      </div>
      <div class="telar-encabezado">
          <div class="telar-id">${telar.id}</div>
          <div class="telar-rpm">RPM ${telar.rpm}</div>
      </div>
      <div class="telar-info">
          <div class="info-item">
              <div class="info-etiqueta">ARTICULO</div>
              <div class="info-valor">${telar.articulo}</div>
          </div>
          <div class="info-item">
              <div class="info-etiqueta">DISEÑO</div>
              <div class="info-valor">${telar.diseño}</div>
          </div>
      </div>
      <div class="parametros">
          <div class="parametro cmpx-trama">
              <div>CMPX T/P</div>
              <div>${Number(telar.cmpxTrama).toFixed(2)}</div>
          </div>
          <div class="parametro cmpx-urdimbre">
              <div>CMPX U/P</div>
              <div>${Number(telar.cmpxUrdimbre).toFixed(2)}</div>
          </div>
          <div class="parametro eficiencia">
              <div>EFIC. /P</div>
              <div>${Number(telar.eficiencia).toFixed(2)}</div>
          </div>
      </div>
    `;
    grilla.appendChild(elementoTelar);
  });
}

/**
 * Genera el HTML para los indicadores de estado (círculos de colores) de un telar.
 * @param {object} telar - El objeto telar con sus datos.
 * @returns {string} El HTML de los indicadores.
 */
function obtenerIndicadoresEstado(telar) {
  const indicadores = [];
  if (Number(telar.eficiencia) < 87) {
    indicadores.push('<span class="indicador-estado estado-eficiencia-baja" title="Eficiencia baja"></span>');
  } else {
    indicadores.push('<span class="indicador-estado estado-eficiencia-alta" title="Eficiencia alta"></span>');
  }
  if (Number(telar.cmpxTrama) + Number(telar.cmpxUrdimbre) > 10) {
    indicadores.push('<span class="indicador-estado estado-cmpx-alto" title="CMPX alto"></span>');
  } else {
    indicadores.push('<span class="indicador-estado estado-cmpx-bajo" title="CMPX bajo"></span>');
  }
  return indicadores.join("");
}

/**
 * Muestra la fecha del reporte en la cabecera de la aplicación.
 */
function visualizarFechaReporte() {
  const divFecha = document.getElementById("infoFecha");
  if (divFecha) {
    let fechaFormateada = "";
    if (fechaReporte) {
      // La fecha de Excel es un número serial, se debe convertir.
      if (!isNaN(fechaReporte)) {
        fechaFormateada = formatearFechaExcel(Number(fechaReporte));
      } else {
        fechaFormateada = fechaReporte; // Si ya es texto, usar directamente.
      }
    }
    divFecha.textContent = fechaFormateada ? `Fecha de Reporte: ${fechaFormateada}` : "";
  }
}

// =================================================================================
// Manejadores de Eventos e Inicialización
// =================================================================================

/**
 * Lee el archivo seleccionado por el usuario y dispara el procesamiento.
 * @param {File} archivo - El archivo Excel seleccionado.
 */
function manejarArchivo(archivo) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    // Guardar en sessionStorage para persistir entre recargas
    sessionStorage.setItem("archivoDatos", JSON.stringify(Array.from(data)));
    procesarDatosExcel(data);
  };
  reader.readAsArrayBuffer(archivo);
}

/**
 * Reinicia todos los filtros a su estado por defecto y actualiza la vista.
 */
function reiniciarFiltros() {
  filtroTurnoActual = "todos";
  filtroTipoActual = "todos";
  busquedaPorIds = [];
  busquedaPorCodigosOcurrencia = [];

  document.getElementById("selectorFiltroTurno").value = "todos";
  document.getElementById("selectorFiltroTipo").value = "todos";
  document.getElementById("campoBusquedaTelar").value = "";
  document.getElementById("campoBusquedaOcurrencia").value = "";
  
  actualizarVisualizacion();
}

// Se ejecuta cuando el DOM está completamente cargado.
document.addEventListener("DOMContentLoaded", function () {
  // --- Obtención de Elementos del DOM ---
  const zonaArrastre = document.getElementById("zonaArrastre");
  const inputArchivo = document.getElementById("inputArchivo");
  const selectorFiltroTurno = document.getElementById("selectorFiltroTurno");
  const selectorFiltroTipo = document.getElementById("selectorFiltroTipo");
  const campoBusquedaTelar = document.getElementById("campoBusquedaTelar");
  const campoBusquedaOcurrencia = document.getElementById("campoBusquedaOcurrencia");
  const checkboxPromedio = document.getElementById("checkboxPromedio");
  const botonImprimir = document.getElementById("botonImprimir");

  // --- Carga de Datos desde Session Storage (si existen) ---
  const datosGuardados = sessionStorage.getItem("archivoDatos");
  if (datosGuardados) {
    const data = new Uint8Array(JSON.parse(datosGuardados));
    procesarDatosExcel(data);
  }

  // --- Configuración de Event Listeners ---

  // Zona de Arrastrar y Soltar (Drag and Drop)
  if (zonaArrastre) {
    zonaArrastre.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      zonaArrastre.classList.add("dragover");
    });
    zonaArrastre.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      zonaArrastre.classList.remove("dragover");
    });
    zonaArrastre.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      zonaArrastre.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        manejarArchivo(e.dataTransfer.files[0]);
      }
    });
    zonaArrastre.addEventListener("click", () => inputArchivo.click());
  }

  // Input de Archivo
  if (inputArchivo) {
    inputArchivo.addEventListener("change", function () {
      if (this.files.length > 0) {
        manejarArchivo(this.files[0]);
      }
    });
  }

  // Filtro por Turno
  if (selectorFiltroTurno) {
    selectorFiltroTurno.addEventListener("change", function () {
      filtroTurnoActual = this.value;
      actualizarVisualizacion();
    });
  }

  // Filtro por Tipo
  if (selectorFiltroTipo) {
    selectorFiltroTipo.addEventListener("change", function () {
      filtroTipoActual = this.value;
      // Muestra u oculta el campo de búsqueda de ocurrencias
      campoBusquedaOcurrencia.style.display = this.value === "con_ocurrencias" ? "inline-block" : "none";
      if (this.value !== "con_ocurrencias") {
        campoBusquedaOcurrencia.value = "";
        busquedaPorCodigosOcurrencia = [];
      }
      actualizarVisualizacion();
    });
  }

  // Búsqueda por ID de Telar
  if (campoBusquedaTelar) {
    campoBusquedaTelar.addEventListener("input", function () {
      const valor = this.value.trim();
      busquedaPorIds = valor ? valor.split(",").map((id) => id.trim()) : [];
      actualizarVisualizacion();
    });
  }

  // Búsqueda por Código de Ocurrencia
  if (campoBusquedaOcurrencia) {
    campoBusquedaOcurrencia.addEventListener("input", function () {
      const valor = this.value.trim();
      busquedaPorCodigosOcurrencia = valor ? valor.split(",").map((c) => c.trim()) : [];
      actualizarVisualizacion();
    });
  }

  // Checkbox para vista de Promedio
  if (checkboxPromedio) {
    checkboxPromedio.addEventListener("change", function () {
      vistaPromedioActivada = this.checked;
      actualizarVisualizacion();
    });
  }

  // Botón de Imprimir
  if (botonImprimir) {
    botonImprimir.onclick = function () {
      const grilla = document.getElementById("grillaTelares");
      const ventanaImpresion = window.open("", "", "width=900,height=700");
      ventanaImpresion.document.write(`
        <html>
          <head>
            <title>Imprimir Telares</title>
            <link rel="stylesheet" href="css/styles.css" />
            <style>
              body { background: #fff; }
              .contenedor-principal { box-shadow: none; }
              @media print {
                .controles, .header h1, .header .legend { display: none; }
                .tarjeta-telar { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="grilla-telares">
              ${grilla.innerHTML}
            </div>
          </body>
        </html>
      `);
      ventanaImpresion.document.close();
      ventanaImpresion.onload = function () {
        ventanaImpresion.focus();
        ventanaImpresion.print();
        ventanaImpresion.close();
      };
    };
  }
});

// =================================================================================
// Funciones Utilitarias
// =================================================================================

/**
 * Convierte una fecha en formato serial de Excel a una cadena YYYY/MM/DD.
 * @param {number} serial - El número de serie de la fecha de Excel.
 * @returns {string} La fecha formateada.
 */
function formatearFechaExcel(serial) {
  // La época de Excel es el 30 de diciembre de 1899 para compatibilidad con Lotus 1-2-3.
  const fechaBase = new Date(Date.UTC(1899, 11, 30));
  fechaBase.setUTCDate(fechaBase.getUTCDate() + serial);
  const anio = fechaBase.getUTCFullYear();
  const mes = String(fechaBase.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fechaBase.getUTCDate()).padStart(2, "0");
  return `${anio}/${mes}/${dia}`;
}
