
export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  // Manejo de CORS para desarrollo local si fuera necesario
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se permiten peticiones POST' });
  }

  try {
    const { url, body } = req.body;

    if (!url || !body) {
      console.error('❌ Proxy Error: Faltan parámetros url o body');
      return res.status(400).json({ error: 'Falta URL o Cuerpo XML' });
    }

    console.log(`[Proxy] Reenviando a: ${url}`);
    console.log(`[Proxy] Tamaño del body: ${body.length} bytes`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Accept': 'text/xml',
        'User-Agent': 'SJS-Vercel-Proxy/1.0'
      },
      body: body,
    });

    const responseData = await response.text();
    console.log(`[Proxy] Odoo respondió con status: ${response.status}`);

    res.setHeader('Content-Type', 'text/xml');
    return res.status(response.status).send(responseData);

  } catch (error: any) {
    console.error('❌ Proxy Fatal Error:', error.message);
    return res.status(500).json({ 
      error: 'Error en la comunicación con el servidor central',
      details: error.message 
    });
  }
}
