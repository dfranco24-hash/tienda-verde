/**
 * ============================================================
 * CONECTOR: App de Recepción de Material Reciclable  <->  Google Sheets
 * ============================================================
 * Pega TODO este archivo en el editor de Apps Script de tu Google Sheet
 * (Extensiones → Apps Script). No necesitas instalar nada más.
 *
 * Instrucciones completas en: conectar-google-sheets.md
 * ============================================================
 */

// ==================== CONFIGURA ESTO ====================
// Cambia esta palabra por una clave secreta tuya (la misma que
// vas a pegar en las constantes SHEETS_URL / SHEETS_TOKEN al
// inicio del archivo recepcion-material-reciclable.html).
var TOKEN = "tiendaverde2026secreto";

var SHEET_MATERIALES = "Materiales";
var SHEET_PROVEEDORES = "Proveedores";
var SHEET_RECEPCIONES = "Recepciones";
// ==========================================================

var CAMPOS_MATERIALES = ["id", "nombre", "rate", "color", "precioPendiente"];
var CAMPOS_PROVEEDORES = ["id", "nombre", "telefono", "materialFrecuente"];
var CAMPOS_RECEPCIONES = ["id", "fecha", "providerId", "materialId", "peso", "precioKg", "pagado", "responsable", "observaciones"];

/**
 * GET — usado por la app al abrir, y por el botón "🔄 Recargar".
 * Ejemplo: https://.../exec?token=tu-clave
 */
function doGet(e) {
  if (!e || e.parameter.token !== TOKEN) {
    return responder({ error: "Token inválido o ausente." });
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return responder({
    materials: leerHoja(ss, SHEET_MATERIALES, CAMPOS_MATERIALES),
    providers: leerHoja(ss, SHEET_PROVEEDORES, CAMPOS_PROVEEDORES),
    records: leerHoja(ss, SHEET_RECEPCIONES, CAMPOS_RECEPCIONES),
  });
}

/**
 * POST — usado por la app para escribir en el Sheet.
 * Acciones soportadas (body.action):
 *   - "addRecord"   { token, record }              → agrega una recepción nueva.
 *   - "addProvider" { token, provider }             → agrega un proveedor (si el id no existe ya).
 *   - "updateRecord"{ token, id, cambios }          → actualiza campos puntuales de una recepción (ej. pagado).
 *   - "replaceAll"  { token, materials?, providers?, records? } → reemplaza hojas completas
 *     (usado solo para la migración inicial de datos, desde la app).
 */
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ error: "No se pudo leer la solicitud." });
  }
  if (body.token !== TOKEN) {
    return responder({ error: "Token inválido o ausente." });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  switch (body.action) {
    case "replaceAll":
      if (body.materials) escribirHoja(ss, SHEET_MATERIALES, CAMPOS_MATERIALES, body.materials);
      escribirHoja(ss, SHEET_PROVEEDORES, CAMPOS_PROVEEDORES, body.providers || []);
      escribirHoja(ss, SHEET_RECEPCIONES, CAMPOS_RECEPCIONES, body.records || []);
      return responder({
        ok: true,
        materials: (body.materials || []).length,
        providers: (body.providers || []).length,
        records: (body.records || []).length,
      });

    case "addProvider":
      if (!body.provider || !body.provider.id) return responder({ error: "Falta el proveedor a agregar." });
      agregarFilaSiNoExiste(ss, SHEET_PROVEEDORES, CAMPOS_PROVEEDORES, body.provider);
      return responder({ ok: true });

    case "addRecord":
      if (!body.record || !body.record.id) return responder({ error: "Falta la recepción a agregar." });
      agregarFila(ss, SHEET_RECEPCIONES, CAMPOS_RECEPCIONES, body.record);
      return responder({ ok: true });

    case "updateRecord":
      if (!body.id) return responder({ error: "Falta el id del registro a actualizar." });
      var actualizado = actualizarFila(ss, SHEET_RECEPCIONES, CAMPOS_RECEPCIONES, body.id, body.cambios || {});
      if (!actualizado) return responder({ error: "No se encontró el registro " + body.id });
      return responder({ ok: true });

    default:
      return responder({ error: "Acción no reconocida: " + body.action });
  }
}

// ---------------- funciones internas ----------------

function leerHoja(ss, nombreHoja, campos) {
  var hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) return [];
  var valores = hoja.getDataRange().getValues();
  if (valores.length < 2) return [];
  var encabezados = valores[0];
  var filas = valores.slice(1).filter(function (fila) {
    return fila[0] !== "" && fila[0] !== null;
  });
  return filas.map(function (fila) {
    var obj = {};
    encabezados.forEach(function (h, i) {
      obj[h] = fila[i];
    });
    return obj;
  });
}

function escribirHoja(ss, nombreHoja, campos, filas) {
  var hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) hoja = ss.insertSheet(nombreHoja);
  hoja.clear();
  var datos = [campos].concat(
    filas.map(function (fila) {
      return campos.map(function (c) {
        var v = fila[c];
        return v === undefined || v === null ? "" : v;
      });
    })
  );
  if (datos.length > 0) {
    hoja.getRange(1, 1, datos.length, campos.length).setValues(datos);
  }
}

function obtenerOCrearHoja(ss, nombreHoja, campos) {
  var hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) {
    hoja = ss.insertSheet(nombreHoja);
    hoja.getRange(1, 1, 1, campos.length).setValues([campos]);
  } else if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, campos.length).setValues([campos]);
  }
  return hoja;
}

function agregarFila(ss, nombreHoja, campos, fila) {
  var hoja = obtenerOCrearHoja(ss, nombreHoja, campos);
  var valores = campos.map(function (c) {
    var v = fila[c];
    return v === undefined || v === null ? "" : v;
  });
  hoja.appendRow(valores);
}

function agregarFilaSiNoExiste(ss, nombreHoja, campos, fila) {
  var hoja = obtenerOCrearHoja(ss, nombreHoja, campos);
  var idCol = campos.indexOf("id");
  var valores = hoja.getDataRange().getValues();
  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][idCol]) === String(fila.id)) return; // ya existe, no duplicar
  }
  agregarFila(ss, nombreHoja, campos, fila);
}

function actualizarFila(ss, nombreHoja, campos, id, cambios) {
  var hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) return false;
  var valores = hoja.getDataRange().getValues();
  var idCol = campos.indexOf("id");
  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][idCol]) === String(id)) {
      Object.keys(cambios).forEach(function (campo) {
        var col = campos.indexOf(campo);
        if (col !== -1) hoja.getRange(i + 1, col + 1).setValue(cambios[campo]);
      });
      return true;
    }
  }
  return false;
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
