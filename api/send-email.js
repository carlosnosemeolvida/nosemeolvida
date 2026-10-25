export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Falta el email' });
  }

  // Comprobación para ver si Vercel está leyendo la variable
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'La variable RESEND_API_KEY no está configurada en Vercel' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'NoSeMeOlvida <recordatorios@nosemeolvida.com.mx>',
        to: email,
        subject: '¡Bienvenido a NoSeMeOlvida!',
        html: '<p>Hola, tu cuenta está lista. Empieza a registrar vencimientos para no olvidar nada.</p>'
      })
    });

    if (response.ok) {
      return res.status(200).json({ message: 'Correo enviado' });
    } else {
      const errorData = await response.json();
      return res.status(500).json({ error: errorData });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
