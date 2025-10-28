// Generar PDF del pedido
async function generarPDF() {
    const nombreVendedor = document.getElementById('nombre-vendedor').value.trim();
    
    if (carrito.length === 0 || !nombreVendedor) {
        mostrarNotificacion('Debe agregar productos al carrito y especificar el nombre del vendedor', 'error');
        return;
    }
    
    try {
        // Obtener el correlativo actual
        await cargarCorrelativo();
        
        // Crear PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configuración del documento
        const fecha = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const hora = new Date().toLocaleTimeString('es-ES');
        const totalPedido = carrito.reduce((total, item) => total + (item.cantidad * item.precio), 0);
        
        // Logo y encabezado
        doc.setFontSize(20);
        doc.setTextColor(26, 82, 118);
        doc.text('GONZACARS', 105, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        doc.text('Repuestos Automotrices', 105, 28, { align: 'center' });
        
        // Línea separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 35, 190, 35);
        
        // Información del pedido
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Número de Pedido: ${correlativoActual}`, 20, 45);
        doc.text(`Fecha: ${fecha}`, 20, 52);
        doc.text(`Hora: ${hora}`, 20, 59);
        doc.text(`Vendedor: ${nombreVendedor}`, 20, 66);
        
        // Tabla de productos
        const tableColumn = ["Producto", "Cantidad", "Precio Unit.", "Total"];
        const tableRows = [];
        
        carrito.forEach(item => {
            const totalProducto = item.cantidad * item.precio;
            const productData = [
                item.descripcion,
                item.cantidad.toString(),
                `$${item.precio.toFixed(2)}`,
                `$${totalProducto.toFixed(2)}`
            ];
            tableRows.push(productData);
        });
        
        // Agregar fila de total
        tableRows.push(["", "", "TOTAL:", `$${totalPedido.toFixed(2)}`]);
        
        // Generar tabla
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 80,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 5,
            },
            headStyles: {
                fillColor: [26, 82, 118],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { top: 80 },
            didDrawPage: function (data) {
                // Pie de página en cada página
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(
                    `Página ${doc.internal.getNumberOfPages()}`,
                    data.settings.margin.left,
                    doc.internal.pageSize.height - 10
                );
            }
        });
        
        // Pie de página principal
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Gracias por su pedido', 105, finalY, { align: 'center' });
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Gonzacars - Repuestos Automotrices de Calidad', 105, finalY + 8, { align: 'center' });
        doc.text('Tel: (123) 456-7890 | Email: info@gonzacars.com', 105, finalY + 13, { align: 'center' });
        
        // Guardar PDF
        const nombreArchivo = `Pedido_${correlativoActual}_${nombreVendedor.replace(/\s+/g, '_')}.pdf`;
        doc.save(nombreArchivo);
        
        // Guardar pedido en Google Sheets
        await guardarPedidoEnSheets(nombreVendedor, new Date().toISOString());
        
        mostrarNotificacion(`Pedido ${correlativoActual} guardado y PDF generado`, 'exito');
        
        // Limpiar carrito y cerrar
        setTimeout(() => {
            limpiarCarrito();
            toggleCarrito();
            document.getElementById('nombre-vendedor').value = '';
        }, 1000);
        
    } catch (error) {
        console.error('Error al generar PDF:', error);
        mostrarNotificacion('Error al generar el PDF: ' + error.message, 'error');
    }
}

// Guardar pedido en Google Sheets a través del script
async function guardarPedidoEnSheets(nombreVendedor, fecha) {
    try {
        const pedidosData = carrito.map(item => ({
            idinventario: item.idinventario,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio: item.precio,
            total: item.cantidad * item.precio
        }));

        const response = await fetch(`${SCRIPT_URL}?action=guardarPedido`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pedidos: pedidosData,
                nombreVendedor: nombreVendedor,
                fecha: fecha,
                correlativo: correlativoActual
            })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Actualizar correlativo local
        if (data.nuevoCorrelativo) {
            correlativoActual = data.nuevoCorrelativo;
        }

        return data;
    } catch (error) {
        console.error('Error al guardar pedido:', error);
        throw error;
    }
}