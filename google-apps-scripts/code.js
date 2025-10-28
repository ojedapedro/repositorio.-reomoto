// Código para Google Apps Script - Gonzacars Web Catálogo

// Configuración
const CONFIG = {
    // ID de la hoja de cálculo (reemplazar con el ID real)
    SHEET_ID: 'TU_SHEET_ID_AQUI',
    // Nombres de las hojas
    HOJA_CATALOGO: 'Cat_Vendedores',
    HOJA_PEDIDOS: 'Pedidos',
    HOJA_CONTROL: 'Control'
};

/**
 * Maneja las solicitudes GET
 */
function doGet(e) {
    try {
        const action = e.parameter.action;
        
        switch(action) {
            case 'obtenerCatalogo':
                return obtenerCatalogo();
            case 'obtenerPedidos':
                return obtenerPedidos();
            case 'obtenerCorrelativo':
                return obtenerCorrelativo();
            default:
                return crearRespuestaError('Acción no válida', 400);
        }
    } catch (error) {
        console.error('Error en doGet:', error);
        return crearRespuestaError(error.message, 500);
    }
}

/**
 * Maneja las solicitudes POST
 */
function doPost(e) {
    try {
        const action = e.parameter.action;
        
        switch(action) {
            case 'guardarPedido':
                return guardarPedido(e);
            case 'actualizarStock':
                return actualizarStock(e);
            default:
                return crearRespuestaError('Acción no válida', 400);
        }
    } catch (error) {
        console.error('Error en doPost:', error);
        return crearRespuestaError(error.message, 500);
    }
}

/**
 * Obtiene el catálogo completo de productos
 */
function obtenerCatalogo() {
    try {
        const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
        const sheet = spreadsheet.getSheetByName(CONFIG.HOJA_CATALOGO);
        
        if (!sheet) {
            throw new Error(`No se encontró la hoja: ${CONFIG.HOJA_CATALOGO}`);
        }
        
        const data = sheet.getDataRange().getValues();
        
        if (data.length <= 1) {
            return crearRespuesta({productos: []});
        }
        
        const encabezados = data[0];
        const filas = data.slice(1);
        
        const productos = filas.map(fila => {
            const producto = {};
            encabezados.forEach((encabezado, index) => {
                producto[encabezado] = fila[index];
            });
            return producto;
        });
        
        return crearRespuesta({productos: productos});
        
    } catch (error) {
        console.error('Error en obtenerCatalogo:', error);
        return crearRespuestaError('Error al obtener el catálogo: ' + error.message, 500);
    }
}

/**
 * Obtiene el historial de pedidos
 */
function obtenerPedidos() {
    try {
        const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
        const sheet = spreadsheet.getSheetByName(CONFIG.HOJA_PEDIDOS);
        
        if (!sheet) {
            return crearRespuesta({pedidos: []});
        }
        
        const data = sheet.getDataRange().getValues();
        
        if (data.length <= 1) {
            return crearRespuesta({pedidos: []});
        }
        
        const encabezados = data[0];
        const filas = data.slice(1);
        
        const pedidos = filas.map(fila => {
            const pedido = {};
            encabezados.forEach((encabezado, index) => {
                pedido[encabezado] = fila[index];
            });
            return pedido;
        });
        
        return crearRespuesta({pedidos: pedidos});
        
    } catch (error) {
        console.error('Error en obtenerPedidos:', error);
        return crearRespuestaError('Error al obtener los pedidos: ' + error.message, 500);
    }
}

/**
 * Obtiene y actualiza el correlativo de pedidos
 */
function obtenerCorrelativo() {
    try {
        const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
        let sheet = spreadsheet.getSheetByName(CONFIG.HOJA_CONTROL);
        
        // Crear hoja de control si no existe
        if (!sheet) {
            sheet = crearHojaControl(spreadsheet);
        }
        
        let ultimoCorrelativo = sheet.getRange('B1').getValue();
        
        // Si no existe correlativo, inicializar
        if (!ultimoCorrelativo || ultimoCorrelativo === '') {
            ultimoCorrelativo = 'TG-0000000';
            sheet.getRange('B1').setValue(ultimoCorrelativo);
        }
        
        const numero = parseInt(ultimoCorrelativo.split('-')[1]);
        const nuevoNumero = numero + 1;
        const nuevoCorrelativo = `TG-${nuevoNumero.toString().padStart(7, '0')}`;
        
        return crearRespuesta({correlativo: nuevoCorrelativo});
        
    } catch (error) {
        console.error('Error en obtenerCorrelativo:', error);
        return crearRespuestaError('Error al obtener correlativo: ' + error.message, 500);
    }
}

/**
 * Guarda un nuevo pedido en la hoja
 */
function guardarPedido(e) {
    try {
        const datos = JSON.parse(e.postData.contents);
        const { pedidos, nombreVendedor, fecha, correlativo } = datos;
        
        if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
            throw new Error('No hay pedidos para guardar');
        }
        
        if (!nombreVendedor || nombreVendedor.trim() === '') {
            throw new Error('El nombre del vendedor es requerido');
        }
        
        const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
        const sheetPedidos = obtenerOCrearHoja(spreadsheet, CONFIG.HOJA_PEDIDOS, [
            'idinventario', 'Fecha', 'Descripción', 'cantidad', 'Precio', 'Total', 'nombre del vendedor', 'Correlativo'
        ]);
        
        const sheetControl = obtenerOCrearHoja(spreadsheet, CONFIG.HOJA_CONTROL, [
            'ÚltimoCorrelativo'
        ]);
        
        // Preparar datos para insertar
        const filas = pedidos.map(pedido => [
            pedido.idinventario,
            fecha,
            pedido.descripcion,
            pedido.cantidad,
            pedido.precio,
            pedido.total,
            nombreVendedor,
            correlativo
        ]);
        
        // Insertar filas en la hoja de pedidos
        if (filas.length > 0) {
            const ultimaFila = sheetPedidos.getLastRow();
            sheetPedidos.getRange(ultimaFila + 1, 1, filas.length, filas[0].length).setValues(filas);
        }
        
        // Actualizar stock en el catálogo
        actualizarStockCatalogo(pedidos);
        
        // Actualizar correlativo
        const numero = parseInt(correlativo.split('-')[1]);
        const nuevoNumero = numero + 1;
        const nuevoCorrelativo = `TG-${nuevoNumero.toString().padStart(7, '0')}`;
        sheetControl.getRange('B1').setValue(nuevoCorrelativo);
        
        return crearRespuesta({
            mensaje: 'Pedido guardado exitosamente',
            pedidosGuardados: filas.length,
            correlativo: correlativo,
            nuevoCorrelativo: nuevoCorrelativo
        });
        
    } catch (error) {
        console.error('Error en guardarPedido:', error);
        return crearRespuestaError('Error al guardar el pedido: ' + error.message, 500);
    }
}

/**
 * Actualiza el stock en el catálogo después de un pedido
 */
function actualizarStockCatalogo(pedidos) {
    try {
        const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
        const sheetCatalogo = spreadsheet.getSheetByName(CONFIG.HOJA_CATALOGO);
        
        if (!sheetCatalogo) {
            throw new Error('No se encontró la hoja de catálogo');
        }
        
        const data = sheetCatalogo.getDataRange().getValues();
        const encabezados = data[0];
        
        // Encontrar índices de las columnas
        const idIndex = encabezados.indexOf('idinventario');
        const stockActualIndex = encabezados.indexOf('Stock Actual');
        
        if (idIndex === -1 || stockActualIndex === -1) {
            throw new Error('No se encontraron las columnas necesarias en el catálogo');
        }
        
        // Actualizar stock para cada producto en el pedido
        pedidos.forEach(pedido => {
            for (let i = 1; i < data.length; i++) {
                if (data[i][idIndex] === pedido.idinventario) {
                    const stockActual = parseInt(data[i][stockActualIndex]) || 0;
                    const nuevoStock = stockActual - parseInt(pedido.cantidad);
                    
                    // Actualizar en la hoja
                    sheetCatalogo.getRange(i + 1, stockActualIndex + 1).setValue(Math.max(0, nuevoStock));
                    break;
                }
            }
        });
        
    } catch (error) {
        console.error('Error en actualizarStockCatalogo:', error);
        throw error;
    }
}

/**
 * Actualiza el stock de un producto específico
 */
function actualizarStock(e) {
    try {
        const datos = JSON.parse(e.postData.contents);
        const { idinventario, nuevoStock } = datos;
        
        if (!idinventario || nuevoStock === undefined) {
            throw new Error('ID de inventario y nuevo stock son requeridos');
        }
        
        const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
        const sheetCatalogo = spreadsheet.getSheetByName(CONFIG.HOJA_CATALOGO);
        
        if (!sheetCatalogo) {
            throw new Error('No se encontró la hoja de catálogo');
        }
        
        const data = sheetCatalogo.getDataRange().getValues();
        const encabezados = data[0];
        
        const idIndex = encabezados.indexOf('idinventario');
        const stockActualIndex = encabezados.indexOf('Stock Actual');
        
        if (idIndex === -1 || stockActualIndex === -1) {
            throw new Error('No se encontraron las columnas necesarias en el catálogo');
        }
        
        let productoEncontrado = false;
        
        for (let i = 1; i < data.length; i++) {
            if (data[i][idIndex] === idinventario) {
                sheetCatalogo.getRange(i + 1, stockActualIndex + 1).setValue(parseInt(nuevoStock));
                productoEncontrado = true;
                break;
            }
        }
        
        if (!productoEncontrado) {
            throw new Error('Producto no encontrado');
        }
        
        return crearRespuesta({mensaje: 'Stock actualizado exitosamente'});
        
    } catch (error) {
        console.error('Error en actualizarStock:', error);
        return crearRespuestaError('Error al actualizar stock: ' + error.message, 500);
    }
}

/**
 * Crea la hoja de control si no existe
 */
function crearHojaControl(spreadsheet) {
    const sheet = spreadsheet.insertSheet(CONFIG.HOJA_CONTROL);
    sheet.getRange('A1:B1').setValues([['ÚltimoCorrelativo', 'TG-0000000']]);
    return sheet;
}

/**
 * Obtiene o crea una hoja con los encabezados especificados
 */
function obtenerOCrearHoja(spreadsheet, nombreHoja, encabezados) {
    let sheet;
    try {
        sheet = spreadsheet.getSheetByName(nombreHoja);
    } catch (e) {
        sheet = spreadsheet.insertSheet(nombreHoja);
        if (encabezados && encabezados.length > 0) {
            sheet.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
        }
    }
    return sheet;
}

/**
 * Crea una respuesta JSON exitosa
 */
function crearRespuesta(data) {
    return ContentService
        .createTextOutput(JSON.stringify(data))
        .setMimetype(ContentService.MimeType.JSON);
}

/**
 * Crea una respuesta de error
 */
function crearRespuestaError(mensaje, codigo = 500) {
    return ContentService
        .createTextOutput(JSON.stringify({error: mensaje}))
        .setMimetype(ContentService.MimeType.JSON)
        .setStatusCode(codigo);
}

/**
 * Función para configurar las hojas por primera vez (ejecutar manualmente)
 */
function configurarHojas() {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    
    // Crear hoja de catálogo
    let sheet = obtenerOCrearHoja(spreadsheet, CONFIG.HOJA_CATALOGO, [
        'idinventario', 'Descripción', 'Stock Inicial', 'Stock Actual', 'stockFinal', 'Costo', 'Precio de venta'
    ]);
    
    // Agregar datos de ejemplo si está vacía
    if (sheet.getLastRow() <= 1) {
        sheet.getRange('A2:G5').setValues([
            ['001', 'Filtro de Aceite', 50, 25, 25, 5.00, 10.00],
            ['002', 'Pastillas de Freno', 30, 10, 10, 15.00, 30.00],
            ['003', 'Bujías', 100, 75, 75, 3.00, 7.00],
            ['004', 'Aceite Motor 5W-30', 40, 0, 0, 8.00, 15.00]
        ]);
    }
    
    // Crear hoja de pedidos
    obtenerOCrearHoja(spreadsheet, CONFIG.HOJA_PEDIDOS, [
        'idinventario', 'Fecha', 'Descripción', 'cantidad', 'Precio', 'Total', 'nombre del vendedor', 'Correlativo'
    ]);
    
    // Crear hoja de control
    crearHojaControl(spreadsheet);
    
    console.log('Hojas configuradas exitosamente');
}

/**
 * Función para probar el script localmente
 */
function probarScript() {
    try {
        configurarHojas();
        console.log('Configuración completada exitosamente');
    } catch (error) {
        console.error('Error en la configuración:', error);
    }
}