export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Necesitamos estas claves para conectarnos a Supabase y a Resend
const SUPABASE_URL = 'https://mglyeepyjyningcjzasz.supabase.co';
// ⚠️ IMPORTANTE: Reemplaza esto con tu clave "service_role" de Supabase
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; 
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export default async function handler(req, res) {
  // 1. Validar que la petición sea de Vercel Cron (seguridad)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // 2. Obtener la fecha de mañana en formato YYYY-MM-DD
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().split('T')[0];

    // 3. Buscar en Supabase los vencimientos que vencen mañana y que no han sido avisados
    const response = await fetch(`${SUPABASE_URL}/rest/v1/vencimientos?fecha=eq.${fechaManana}&aviso_enviado=eq.false`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    const vencimientos = await response.json();

    if (!vencimientos || vencimientos.length === 0) {
      return res.status(200).json({ message: 'No hay recordatorios para enviar hoy.' });
    }

    // 4. Enviar un correo por cada vencimiento
    const resultados = [];
    for (const v of vencimientos) {
      const email = v.email_aviso; // El correo que guardamos al crear el vencimiento
      
      if (email) {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'NoSeMeOlvida <recordatorios@nosemeolvida.com.mx>',
            to: email,
            subject: `⏰ Recordatorio: ${v.nombre} vence mañana`,
            html: `
              <h2>¡Hola!</h2>
              <p>Te recordamos que tu vencimiento <strong>${v.nombre}</strong> vence mañana <strong>${v.fecha}</strong>.</p>
              <p>Categoría: ${v.categoria || 'General'}</p>
              ${v.notas ? `<p>Notas: ${v.notas}</p>` : ''}
              <br>
              <p>Entra a la app para marcar como completado.</p>
            `
          })
        });

        // 5. Marcar en Supabase que ya se envió el aviso
        if (emailResponse.ok) {
            await fetch(`${SUPABASE_URL}/rest/v1/vencimientos?id=eq.${v.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ aviso_enviado: true })
            });
            resultados.push({ id: v.id, status: 'enviado' });
        } else {
            resultados.push({ id: v.id, status: 'error en resend' });
        }
      }
    }

    return res.status(200).json({ message: 'Proceso terminado', resultados });

  } catch (error) {
    console.error('Error en el cron job:', error);
    return res.status(500).json({ error: error.message });
  }
}
