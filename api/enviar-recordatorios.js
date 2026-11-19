export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = 'https://mglyeepyjyningcjzasz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // 1. Obtener la fecha de hoy en formato YYYY-MM-DD
    const hoy = new Date();
    const fechaHoy = new Date(hoy.getTime() - (hoy.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    // 2. Buscar TODOS los vencimientos en Supabase que no han sido avisados
    const response = await fetch(`${SUPABASE_URL}/rest/v1/vencimientos?aviso_enviado=eq.false`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    const vencimientos = await response.json();

    if (!vencimientos || vencimientos.length === 0) {
      return res.status(200).json({ message: 'No hay vencimientos pendientes de aviso.' });
    }

    // 3. Revisar cuáles toca avisar HOY y enviar los correos
    const resultados = [];
    
    for (const v of vencimientos) {
      const fechaV = new Date(v.fecha + 'T00:00:00');
      const fechaH = new Date(fechaHoy + 'T00:00:00');
      
      // Calcular cuántos días faltan para el vencimiento
      const diasFaltantes = Math.round((fechaV - fechaH) / (1000 * 60 * 60 * 24));
      
      // Si los días que faltan NO coinciden con los días de aviso configurados, lo saltamos
      if (diasFaltantes !== parseInt(v.dias_aviso)) {
        continue;
      }

      const email = v.email_aviso;
      
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
            subject: `⏰ Recordatorio: ${v.nombre} vence en ${v.dias_aviso} días`,
            html: `
              <h2>¡Hola!</h2>
              <p>Te recordamos que tu vencimiento <strong>${v.nombre}</strong> vence en <strong>${v.dias_aviso} días</strong> (el ${v.fecha}).</p>
              <p>Categoría: ${v.categoria || 'General'}</p>
              ${v.notas ? `<p>Notas: ${v.notas}</p>` : ''}
              <br>
              <p>Entra a la app para marcar como completado.</p>
            `
          })
        });

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
