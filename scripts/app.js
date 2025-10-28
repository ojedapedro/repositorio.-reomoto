// Configuración de Google Apps Script
// IMPORTANTE: Reemplazar con la URL real de tu Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxcLKKg25g_VElXLI9OzIxYGyJcQW9pRcQ2rw9iGjd92S9lNRPpa5n7xPazOEUjWQRA/exec';

// Estado de la aplicación
let productos = [];
let pedidos = [];
let carrito = [];
let correlativoActual = 'TG-0000001';

// Elementos DOM
const elementos = {
    seccionCatalogo: document.getElementById('seccion-catalogo'),
    seccionPedidos: document.getElementById('seccion-pedidos'),
    listaProductos: document.getElementById('lista-productos'),
    listaPedidos: document.getElementById('lista-pedidos'),
    modalProducto: document.getElementById('modal-producto'),
    carritoElement: document.getElementById('carrito'),
    buscarProducto: document.getElementById('buscar-producto'),
    filtroStock: document.getElementById('filtro-stock'),
    btnCarrito: document.getElementById('btn-carrito'),
    contadorCarrito: document.getElementById('contador-carrito'),
    notificaciones: document.getElementById('notificaciones')
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    inicializarAplicacion();
});

async function inicializarAplicacion() {
    try {
        configurarEventListeners();
        await cargarProductos();
        await cargarCorrelativo();
        mostrarNotificacion('Sistema cargado correctamente', 'exito');
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        mostrarNotificacion('Error al cargar el sistema', 'error');
    }
}

// Configurar event listeners
function configurarEventListeners() {
    // Navegación
    document.getElementById('nav-catalogo').addEventListener('click', (e) => {
        e.preventDefault();
        mostrarSeccion('catalogo');
    });
    
    document.getElementById('nav-pedidos').addEventListener('click', (e) => {
        e.preventDefault();
        mostrarSeccion('pedidos');
    });
    
    // Carrito
    elementos.btnCarrito.addEventListener('click', toggleCarrito);
    document.getElementById('carrito-cerrar').addEventListener('click', toggleCarrito);
    document.getElementById('btn-limpiar-carrito').addEventListener('click', limpiarCarrito);
    document.getElementById('btn-generar-pdf').addEventListener('click', generarPDF);
    
    // Modal
    document.querySelector('.close').addEventListener('click', cerrarModal);
    document.getElementById('btn-agregar-pedido').addEventListener('click', agregarAlCarrito);
    
    // Filtros
    elementos.buscarProducto.addEventListener('input', filtrarProductos);
    elementos.filtroStock.addEventListener('change', filtrarProductos);
    
    // Pedidos
    document.getElementById('btn-actualizar-pedidos').addEventListener('click', cargarPedidos);
    
    // Validar nombre del vendedor
    document.getElementById('nombre-vendedor').addEventListener('input', validarFormularioPedido);
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === elementos.modalProducto) {
            cerrarModal();
        }
    });
}

// Mostrar/ocultar secciones
function mostrarSeccion(seccion) {
    elementos.seccionCatalogo.classList.remove('active');
    elementos.seccionPedidos.classList.remove('active');
    document.getElementById('nav-catalogo').classList.remove('active');
    document.getElementById('nav-pedidos').classList.remove('active');
    
    if (seccion === 'catalogo') {
        elementos.seccionCatalogo.classList.add('active');
        document.getElementById('nav-catalogo').classList.add('active');
    } else if (seccion === 'pedidos') {
        elementos.seccionPedidos.classList.add('active');
        document.getElementById('nav-pedidos').classList.add('active');
        cargarPedidos();
    }
}

// Cargar productos desde Google Apps Script
async function cargarProductos() {
    try {
        elementos.listaProductos.innerHTML = '<div class="cargando">Cargando productos...</div>';
        
        const response = await fetch(`${SCRIPT_URL}?action=obtenerCatalogo`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (data.productos && Array.isArray(data.productos)) {
            productos = data.productos;
            mostrarProductos(productos);
        } else {
            throw new Error('Formato de respuesta inválido');
        }
    } catch (error) {
        console.error('Error al cargar productos:', error);
        elementos.listaProductos.innerHTML = `
            <div class="error-carga">
                <p>Error al cargar los productos: ${error.message}</p>
                <button onclick="cargarProductos()" class="btn-secondary">Reintentar</button>
            </div>
        `;
        
        // Datos de ejemplo para desarrollo
        productos = [
            { idinventario: '001', Descripción: 'Filtro de Aceite', 'Stock Inicial': 50, 'Stock Actual': 25, stockFinal: 25, Costo: 5.00, 'Precio de venta': 10.00 },
            { idinventario: '002', Descripción: 'Pastillas de Freno', 'Stock Inicial': 30, 'Stock Actual': 10, stockFinal: 10, Costo: 15.00, 'Precio de venta': 30.00 },
            { idinventario: '003', Descripción: 'Bujías', 'Stock Inicial': 100, 'Stock Actual': 75, stockFinal: 75, Costo: 3.00, 'Precio de venta': 7.00 },
            { idinventario: '004', Descripción: 'Aceite Motor 5W-30', 'Stock Inicial': 40, 'Stock Actual': 0, stockFinal: 0, Costo: 8.00, 'Precio de venta': 15.00 }
        ];
        mostrarProductos(productos);
    }
}

// Mostrar productos en la interfaz
function mostrarProductos(listaProductos) {
    if (listaProductos.length === 0) {
        elementos.listaProductos.innerHTML = '<div class="cargando">No se encontraron productos</div>';
        return;
    }
    
    elementos.listaProductos.innerHTML = '';
    
    listaProductos.forEach(producto => {
        const stockActual = parseInt(producto['Stock Actual']) || 0;
        const precio = parseFloat(producto['Precio de venta']) || 0;
        const descripcion = producto.Descripción || 'Sin descripción';
        
        let stockClass = 'disponible';
        let stockText = `Stock: ${stockActual}`;
        
        if (stockActual === 0) {
            stockClass = 'sin-stock';
            stockText = 'Sin stock';
        } else if (stockActual <= 10) {
            stockClass = 'bajo';
            stockText = `Stock bajo: ${stockActual}`;
        }
        
        const productoCard = document.createElement('div');
        productoCard.className = `producto-card ${stockActual === 0 ? 'sin-stock' : ''}`;
        productoCard.dataset.id = producto.idinventario;
        
        productoCard.innerHTML = `
            <h3>${descripcion}</h3>
            <div class="producto-info">
                <span class="precio">$${precio.toFixed(2)}</span>
                <span class="stock ${stockClass}">${stockText}</span>
            </div>
            <div class="producto-id"><strong>ID:</strong> ${producto.idinventario}</div>
            <button class="btn-primary btn-ver-detalle" ${stockActual === 0 ? 'disabled' : ''}>
                ${stockActual === 0 ? 'Sin Stock' : 'Ver Detalles'}
            </button>
        `;
        
        if (stockActual > 0) {
            productoCard.querySelector('.btn-ver-detalle').addEventListener('click', () => mostrarDetalleProducto(producto));
        }
        
        elementos.listaProductos.appendChild(productoCard);
    });
}

// Filtrar productos
function filtrarProductos() {
    const textoBusqueda = elementos.buscarProducto.value.toLowerCase();
    const filtro = elementos.filtroStock.value;
    
    let productosFiltrados = productos.filter(producto => {
        const descripcion = (producto.Descripción || '').toLowerCase();
        const idinventario = (producto.idinventario || '').toLowerCase();
        const stockActual = parseInt(producto['Stock Actual']) || 0;
        
        const coincideBusqueda = descripcion.includes(textoBusqueda) || 
                                idinventario.includes(textoBusqueda);
        
        let coincideFiltro = true;
        if (filtro === 'disponible') {
            coincideFiltro = stockActual > 0;
        } else if (filtro === 'bajo-stock') {
            coincideFiltro = stockActual > 0 && stockActual <= 10;
        } else if (filtro === 'sin-stock') {
            coincideFiltro = stockActual === 0;
        }
        
        return coincideBusqueda && coincideFiltro;
    });
    
    mostrarProductos(productosFiltrados);
}

// Mostrar detalle del producto en modal
function mostrarDetalleProducto(producto) {
    const stockActual = parseInt(producto['Stock Actual']) || 0;
    const stockInicial = parseInt(producto['Stock Inicial']) || 0;
    const precio = parseFloat(producto['Precio de venta']) || 0;
    const costo = parseFloat(producto.Costo) || 0;
    const descripcion = producto.Descripción || 'Sin descripción';
    
    document.getElementById('modal-id').textContent = producto.idinventario;
    document.getElementById('modal-descripcion').textContent = descripcion;
    document.getElementById('modal-stock-inicial').textContent = stockInicial;
    document.getElementById('modal-stock').textContent = stockActual;
    document.getElementById('modal-costo').textContent = costo.toFixed(2);
    document.getElementById('modal-precio').textContent = precio.toFixed(2);
    
    const inputCantidad = document.getElementById('cantidad-pedido');
    inputCantidad.value = 1;
    inputCantidad.max = stockActual;
    inputCantidad.min = 1;
    
    elementos.modalProducto.classList.add('active');
}

// Cerrar modal
function cerrarModal() {
    elementos.modalProducto.classList.remove('active');
}

// Agregar producto al carrito
function agregarAlCarrito() {
    const idProducto = document.getElementById('modal-id').textContent;
    const cantidad = parseInt(document.getElementById('cantidad-pedido').value);
    
    const producto = productos.find(p => p.idinventario === idProducto);
    
    if (!producto) {
        mostrarNotificacion('Producto no encontrado', 'error');
        return;
    }
    
    const stockActual = parseInt(producto['Stock Actual']) || 0;
    const precio = parseFloat(producto['Precio de venta']) || 0;
    const descripcion = producto.Descripción || 'Sin descripción';
    
    if (cantidad <= 0 || cantidad > stockActual) {
        mostrarNotificacion('Cantidad no válida o stock insuficiente', 'error');
        return;
    }
    
    // Verificar si el producto ya está en el carrito
    const itemExistente = carrito.find(item => item.idinventario === idProducto);
    
    if (itemExistente) {
        const nuevaCantidad = itemExistente.cantidad + cantidad;
        if (nuevaCantidad > stockActual) {
            mostrarNotificacion(`No hay suficiente stock. Stock disponible: ${stockActual}`, 'error');
            return;
        }
        itemExistente.cantidad = nuevaCantidad;
    } else {
        carrito.push({
            idinventario: idProducto,
            descripcion: descripcion,
            cantidad: cantidad,
            precio: precio,
            stockActual: stockActual
        });
    }
    
    actualizarCarrito();
    cerrarModal();
    toggleCarrito();
    mostrarNotificacion('Producto agregado al carrito', 'exito');
}

// Actualizar carrito en la interfaz
function actualizarCarrito() {
    const carritoItems = document.getElementById('carrito-items');
    const carritoTotal = document.getElementById('carrito-total');
    const carritoVacio = document.getElementById('carrito-vacio');
    const tablaCarrito = document.getElementById('tabla-carrito');
    const carritoTotalContainer = document.getElementById('carrito-total-container');
    const carritoAcciones = document.getElementById('carrito-acciones');
    
    carritoItems.innerHTML = '';
    
    let total = 0;
    
    if (carrito.length === 0) {
        carritoVacio.style.display = 'block';
        tablaCarrito.style.display = 'none';
        carritoTotalContainer.style.display = 'none';
        carritoAcciones.style.display = 'none';
    } else {
        carritoVacio.style.display = 'none';
        tablaCarrito.style.display = 'table';
        carritoTotalContainer.style.display = 'block';
        carritoAcciones.style.display = 'flex';
        
        carrito.forEach((item, index) => {
            const subtotal = item.cantidad * item.precio;
            total += subtotal;
            
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${item.descripcion}</td>
                <td>${item.cantidad}</td>
                <td>$${item.precio.toFixed(2)}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td>
                    <button class="btn-eliminar" data-index="${index}" title="Eliminar producto">
                        🗑️
                    </button>
                </td>
            `;
            
            carritoItems.appendChild(fila);
        });
        
        carritoTotal.textContent = total.toFixed(2);
        
        // Agregar event listeners a los botones eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                eliminarDelCarrito(index);
            });
        });
    }
    
    elementos.contadorCarrito.textContent = carrito.length;
    validarFormularioPedido();
}

// Eliminar producto del carrito
function eliminarDelCarrito(index) {
    if (index >= 0 && index < carrito.length) {
        const productoEliminado = carrito[index];
        carrito.splice(index, 1);
        actualizarCarrito();
        mostrarNotificacion(`"${productoEliminado.descripcion}" eliminado del carrito`, 'exito');
    }
}

// Limpiar carrito
function limpiarCarrito() {
    if (carrito.length > 0) {
        if (confirm('¿Estás seguro de que quieres limpiar el carrito?')) {
            carrito = [];
            actualizarCarrito();
            mostrarNotificacion('Carrito limpiado', 'exito');
        }
    }
}

// Validar formulario de pedido
function validarFormularioPedido() {
    const nombreVendedor = document.getElementById('nombre-vendedor').value.trim();
    const btnGenerarPDF = document.getElementById('btn-generar-pdf');
    
    btnGenerarPDF.disabled = carrito.length === 0 || nombreVendedor === '';
}

// Mostrar/ocultar carrito
function toggleCarrito() {
    elementos.carritoElement.classList.toggle('active');
}

// Cargar pedidos desde Google Apps Script
async function cargarPedidos() {
    try {
        elementos.listaPedidos.innerHTML = '<div class="cargando">Cargando pedidos...</div>';
        
        const response = await fetch(`${SCRIPT_URL}?action=obtenerPedidos`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (data.pedidos && Array.isArray(data.pedidos)) {
            pedidos = data.pedidos;
            mostrarPedidos(pedidos);
        } else {
            throw new Error('Formato de respuesta inválido');
        }
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        elementos.listaPedidos.innerHTML = `
            <div class="error-carga">
                <p>Error al cargar los pedidos: ${error.message}</p>
                <button onclick="cargarPedidos()" class="btn-secondary">Reintentar</button>
            </div>
        `;
        
        // Datos de ejemplo para desarrollo
        pedidos = [
            { idinventario: '001', Fecha: '2023-10-15', Descripción: 'Filtro de Aceite', cantidad: 5, Precio: 10.00, Total: 50.00, 'nombre del vendedor': 'Juan Pérez', Correlativo: 'TG-0000001' },
            { idinventario: '002', Fecha: '2023-10-16', Descripción: 'Pastillas de Freno', cantidad: 2, Precio: 30.00, Total: 60.00, 'nombre del vendedor': 'María García', Correlativo: 'TG-0000002' }
        ];
        mostrarPedidos(pedidos);
    }
}

// Mostrar pedidos en la interfaz
function mostrarPedidos(listaPedidos) {
    if (listaPedidos.length === 0) {
        elementos.listaPedidos.innerHTML = '<div class="cargando">No hay pedidos registrados</div>';
        return;
    }
    
    // Ordenar pedidos por fecha (más recientes primero)
    listaPedidos.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
    
    elementos.listaPedidos.innerHTML = '';
    
    listaPedidos.forEach(pedido => {
        const pedidoCard = document.createElement('div');
        pedidoCard.className = 'pedido-card';
        
        const fecha = new Date(pedido.Fecha).toLocaleDateString('es-ES');
        const total = parseFloat(pedido.Total || 0).toFixed(2);
        const precio = parseFloat(pedido.Precio || 0).toFixed(2);
        
        pedidoCard.innerHTML = `
            <div class="pedido-header">
                <h3>Pedido ${pedido.Correlativo || ''}</h3>
                <span class="vendedor">${pedido['nombre del vendedor'] || 'Vendedor no especificado'}</span>
            </div>
            <div class="pedido-detalle">
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Producto:</strong> ${pedido.Descripción} (ID: ${pedido.idinventario})</p>
                <p><strong>Cantidad:</strong> ${pedido.cantidad}</p>
                <p><strong>Precio unitario:</strong> $${precio}</p>
                <p><strong>Total:</strong> $${total}</p>
            </div>
        `;
        
        elementos.listaPedidos.appendChild(pedidoCard);
    });
}

// Cargar correlativo actual
async function cargarCorrelativo() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=obtenerCorrelativo`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (data.correlativo) {
            correlativoActual = data.correlativo;
        }
    } catch (error) {
        console.error('Error al cargar correlativo:', error);
        // Usar valor por defecto
        correlativoActual = 'TG-0000001';
    }
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.innerHTML = `
        <span class="cerrar">&times;</span>
        <p>${mensaje}</p>
    `;
    
    elementos.notificaciones.appendChild(notificacion);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (notificacion.parentNode) {
            notificacion.parentNode.removeChild(notificacion);
        }
    }, 5000);
    
    // Cerrar al hacer clic en la X
    notificacion.querySelector('.cerrar').addEventListener('click', () => {
        notificacion.parentNode.removeChild(notificacion);
    });
}