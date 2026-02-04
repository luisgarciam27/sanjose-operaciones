
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawData = await req.json();
    const { url, body } = rawData;

    if (!url || !body) {
      return new Response(JSON.stringify({ error: 'URL o cuerpo XML ausente' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Proxy] Iniciando petición a: ${url}`);

    const odooResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Accept': 'text/xml',
        'Connection': 'keep-alive'
      },
      body: body,
    });

    const responseText = await odooResponse.text();

    return new Response(responseText, {
      status: odooResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
        'Cache-Control': 'no-store'
      },
    });

  } catch (error: any) {
    console.error('[Proxy Error]:', error.message);
    return new Response(JSON.stringify({ 
      error: 'Error de conexión con el servidor central', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
