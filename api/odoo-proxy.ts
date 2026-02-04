
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Manejo de CORS manual para el Edge Runtime
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Solo se permite POST' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url, body } = await req.json();

    if (!url || !body) {
      return new Response(JSON.stringify({ error: 'Falta URL o Cuerpo XML' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Edge Proxy] Reenviando a Odoo: ${url}`);

    const odooResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Accept': 'text/xml',
      },
      body: body,
    });

    const responseData = await odooResponse.text();

    return new Response(responseData, {
      status: odooResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      },
    });

  } catch (error: any) {
    console.error('[Edge Proxy Fatal]:', error.message);
    return new Response(JSON.stringify({ 
      error: 'Error de túnel SJS', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
