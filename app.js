// ============================================
// NoSeMeOlvida - App con Supabase
// ============================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// ⚠️ IMPORTANTE: Reemplaza la key con la tuya del archivo .env
const SUPABASE_URL = 'https://mglyeepyjyningcjzasz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nbHllZXB5anluaW5nY2p6YXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMDk0MzUsImV4cCI6MjEwNjg4NTQzNX0.glYqLHkGFfxk9iLBufGTDB3gJ2t-utNQkqnb86K_yTg'




const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// Estado global
// ============================================
let usuarioActual = null
let vencimientos = []

// ============================================
// Referencias del DOM
// ============================================
const seccionLogin = document.getElementById('seccion-login')
const seccionApp = document.getElementById('seccion-app')
const formLogin = document.getElementById('form-login')
const formRegistro = document.getElementById('form-registro')
const formVencimiento = document.getElementById('form-vencimiento')
const inputEmail = document.getElementById('email')
const inputPassword = document.getElementById('password')
const inputEmailReg = document.getElementById('email-reg')
const inputPasswordReg = document.getElementById('password-reg')
const inputNombre = document.getElementById('nombre')
const inputFecha = document.getElementById('fecha')
const lista = document.getElementById('lista')
const vacio = document.getElementById('vacio')
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion')
const userEmail = document.getElementById('user-email')
const mensajeLogin = document.getElementById('mensaje-login')
const tabs = document.querySelectorAll('.tab')

// ============================================
// Funciones de autenticación
// ============================================

async function registrar(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password
  })
  if (error) throw error
  return data
}

async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  })
  if (error) throw error
  return data
}

async function cerrarSesion() {
  await supabase.auth.signOut()
  usuarioActual = null
  mostrarLogin()
}

async function obtenerUsuario() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ============================================
// Funciones de vencimientos
// ============================================

async function cargarVencimientos() {
  const { data, error } = await supabase
    .from('vencimientos')
    .select('*')
    .order('fecha', { ascending: true })
  
  if (error) {
    console.error('Error cargando:', error)
    return []
  }
  return data || []
}

async function agregarVencimiento(nombre, fecha) {
  const { data, error } = await supabase
    .from('vencimientos')
    .insert([{
      nombre: nombre,
      fecha: fecha,
      user_id: usuarioActual.id
    }])
    .select()
  
  if (error) {
    console.error('Error agregando:', error)
    alert('Error al guardar: ' + error.message)
    return null
  }
  return data[0]
}

async function eliminarVencimiento(id) {
  const { error } = await supabase
    .from('vencimientos')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error eliminando:', error)
    return false
  }
  return true
}

// ============================================
// Utilidades
// ============================================

function diasRestantes(fechaStr) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fecha = new Date(fechaStr + 'T00:00:00')
  const diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
  return diff
}

function colorSemaforo(dias) {
  if (dias <= 7) return 'rojo'
  if (dias <= 30) return 'amarillo'
  return 'verde'
}

function textoDias(dias) {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} días`
  if (dias === 0) return 'Vence HOY'
  if (dias === 1) return 'Vence mañana'
  return `Vence en ${dias} días`
}

// ============================================
// Render
// ============================================

function render() {
  lista.innerHTML = ''
  
  if (vencimientos.length === 0) {
    vacio.style.display = 'block'
    return
  }
  vacio.style.display = 'none'

  vencimientos.forEach(v => {
    const dias = diasRestantes(v.fecha)
    const color = colorSemaforo(dias)
    const texto = textoDias(dias)

    const div = document.createElement('div')
    div.className = `vencimiento ${color}`
    div.innerHTML = `
      <div class="info">
        <div class="nombre">${v.nombre}</div>
        <div class="dias">${texto}</div>
      </div>
      <button class="btn-eliminar" data-id="${v.id}" title="Eliminar">✕</button>
    `
    lista.appendChild(div)
  })

  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      if (!confirm('¿Eliminar este vencimiento?')) return
      const ok = await eliminarVencimiento(id)
      if (ok) {
        vencimientos = vencimientos.filter(v => v.id != id)
        render()
      }
    })
  })
}

// ============================================
// Vistas
// ============================================

function mostrarLogin() {
  seccionLogin.style.display = 'block'
  seccionApp.style.display = 'none'
}

function mostrarApp() {
  seccionLogin.style.display = 'none'
  seccionApp.style.display = 'block'
  userEmail.textContent = usuarioActual.email
}

async function cargarYRenderizar() {
  vencimientos = await cargarVencimientos()
  render()
}

// ============================================
// Eventos
// ============================================

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('activo'))
    tab.classList.add('activo')
    
    const tipo = tab.dataset.tab
    if (tipo === 'login') {
      formLogin.style.display = 'block'
      formRegistro.style.display = 'none'
    } else {
      formLogin.style.display = 'none'
      formRegistro.style.display = 'block'
    }
    mensajeLogin.textContent = ''
  })
})

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault()
  mensajeLogin.textContent = 'Entrando...'
  try {
    await iniciarSesion(inputEmail.value, inputPassword.value)
    usuarioActual = await obtenerUsuario()
    mostrarApp()
    await cargarYRenderizar()
    formLogin.reset()
  } catch (error) {
    mensajeLogin.textContent = 'Error: ' + error.message
  }
})

formRegistro.addEventListener('submit', async (e) => {
  e.preventDefault()
  mensajeLogin.textContent = 'Creando cuenta...'
  try {
    await registrar(inputEmailReg.value, inputPasswordReg.value)
    mensajeLogin.textContent = '¡Cuenta creada! Revisa tu email para confirmar, luego inicia sesión.'
    formRegistro.reset()
  } catch (error) {
    mensajeLogin.textContent = 'Error: ' + error.message
  }
})

btnCerrarSesion.addEventListener('click', cerrarSesion)

formVencimiento.addEventListener('submit', async (e) => {
  e.preventDefault()
  const nombre = inputNombre.value.trim()
  const fecha = inputFecha.value
  if (!nombre || !fecha) return

  const nuevo = await agregarVencimiento(nombre, fecha)
  if (nuevo) {
    vencimientos.push(nuevo)
    vencimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    render()
    formVencimiento.reset()
    inputNombre.focus()
  }
})

// ============================================
// Inicialización
// ============================================

async function init() {
  usuarioActual = await obtenerUsuario()
  if (usuarioActual) {
    mostrarApp()
    await cargarYRenderizar()
  } else {
    mostrarLogin()
  }
}

init()
