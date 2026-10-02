
// ============================================
// NoSeMeOlvida - MVP
// ============================================

const STORAGE_KEY = 'nosemeolvida_vencimientos';

// --- Estado ---
let vencimientos = cargar();

// --- Referencias del DOM ---
const form = document.getElementById('form-vencimiento');
const inputNombre = document.getElementById('nombre');
const inputFecha = document.getElementById('fecha');
const lista = document.getElementById('lista');
const vacio = document.getElementById('vacio');

// --- Funciones de persistencia ---
function cargar() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function guardar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vencimientos));
}

// --- Utilidades ---
function diasRestantes(fechaStr) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaStr + 'T00:00:00');
  const diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
  return diff;
}

function colorSemaforo(dias) {
  if (dias <= 7) return 'rojo';
  if (dias <= 30) return 'amarillo';
  return 'verde';
}

function textoDias(dias) {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} días`;
  if (dias === 0) return 'Vence HOY';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}

// --- Render ---
function render() {
  lista.innerHTML = '';
  
  if (vencimientos.length === 0) {
    vacio.style.display = 'block';
    return;
  }
  vacio.style.display = 'none';

  // Ordenar por fecha más próxima
  const ordenados = [...vencimientos].sort((a, b) => 
    new Date(a.fecha) - new Date(b.fecha)
  );

  ordenados.forEach(v => {
    const dias = diasRestantes(v.fecha);
    const color = colorSemaforo(dias);
    const texto = textoDias(dias);

    const div = document.createElement('div');
    div.className = `vencimiento ${color}`;
    div.innerHTML = `
      <div class="info">
        <div class="nombre">${v.nombre}</div>
        <div class="dias">${texto}</div>
      </div>
      <button class="btn-eliminar" data-id="${v.id}" title="Eliminar">✕</button>
    `;
    lista.appendChild(div);
  });

  // Conectar botones eliminar
  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      eliminar(id);
    });
  });
}

// --- Acciones ---
function agregar(nombre, fecha) {
  vencimientos.push({
    id: Date.now().toString(),
    nombre,
    fecha,
    creado: new Date().toISOString()
  });
  guardar();
  render();
}

function eliminar(id) {
  if (!confirm('¿Eliminar este vencimiento?')) return;
  vencimientos = vencimientos.filter(v => v.id !== id);
  guardar();
  render();
}

// --- Eventos ---
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = inputNombre.value.trim();
  const fecha = inputFecha.value;
  if (!nombre || !fecha) return;

  agregar(nombre, fecha);
  form.reset();
  inputNombre.focus();
});

// --- Init ---
render();