
/**
 * Odoo XML-RPC Client - Versión de Diagnóstico Avanzado
 * Diseñada para evitar el error 'ExpatError' (body vacío) en proxies.
 */

const xmlEscape = (str: string) =>
  str.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')
     .replace(/'/g, '&apos;');

const serialize = (value: any): string => {
  if (value === null || value === undefined) return '<value><nil/></value>';
  let content = '';
  if (typeof value === 'number') {
    content = Number.isInteger(value) ? `<int>${value}</int>` : `<double>${value}</double>`;
  } else if (typeof value === 'string') {
    content = `<string>${xmlEscape(value)}</string>`;
  } else if (typeof value === 'boolean') {
    content = `<boolean>${value ? '1' : '0'}</boolean>`;
  } else if (Array.isArray(value)) {
    content = `<array><data>${value.map(v => serialize(v)).join('')}</data></array>`;
  } else if (typeof value === 'object') {
    if (value instanceof Date) {
      const iso = value.toISOString().replace(/\.\d+Z$/, '');
      content = `<dateTime.iso8601>${iso}</dateTime.iso8601>`;
    } else {
      content = `<struct>${Object.entries(value).map(([k, v]) =>
        `<member><name>${xmlEscape(k)}</name>${serialize(v)}</member>`
      ).join('')}</struct>`;
    }
  }
  return `<value>${content}</value>`;
};

const parseValue = (node: Element): any => {
  const child = node.firstElementChild;
  if (!child) return node.textContent;
  switch (child.tagName.toLowerCase()) {
    case 'string': return child.textContent;
    case 'int':
    case 'i4': return parseInt(child.textContent || '0', 10);
    case 'double': return parseFloat(child.textContent || '0');
    case 'boolean': return child.textContent === '1';
    case 'datetime.iso8601': return new Date(child.textContent || '');
    case 'array': return Array.from(child.querySelector('data')?.children || []).map(parseValue);
    case 'struct':
      const obj: any = {};
      Array.from(child.children).forEach(m => {
        const n = m.querySelector('name');
        const v = m.querySelector('value');
        if (n && v) obj[n.textContent || ''] = parseValue(v);
      });
      return obj;
    case 'nil': return null;
    default: return child.textContent;
  }
};

export class OdooClient {
  private uid: number | null = null;
  private apiKey: string | null = null;
  
  public onStatusChange?: (status: string) => void;

  constructor(private url: string, private db: string) {
    this.url = this.url.replace(/\/+$/, '');
  }

  async rpcCall(endpoint: string, methodName: string, params: any[]) {
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><methodCall><methodName>${methodName}</methodName><params>${params.map(p => `<param>${serialize(p)}</param>`).join('')}</params></methodCall>`;
    
    const odooUrl = `${this.url}/xmlrpc/2/${endpoint}`;
    
    // Probamos diferentes proxies, ya que algunos fallan con el body
    const strategies = [
      { 
        name: 'Túnel Ultra (CORS.IO)', 
        url: `https://corsproxy.io/?${encodeURIComponent(odooUrl)}`
      },
      { 
        name: 'Túnel Alternativo (AllOrigins)', 
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(odooUrl)}`
      }
    ];

    let lastError = "";

    for (const strategy of strategies) {
      try {
        if (this.onStatusChange) this.onStatusChange(`Conectando vía ${strategy.name}...`);
        
        // En lugar de Blob, usamos String directamente para algunos proxies
        const response = await fetch(strategy.url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'text/xml'
          },
          body: xmlBody // Enviamos como string puro
        });

        const text = await response.text();
        
        // El error ExpatError ocurre porque el proxy devuelve un 200 pero vacío
        if (!text || text.trim().length === 0) {
          console.error(`[${strategy.name}] El servidor devolvió una respuesta vacía (Cuerpo perdido)`);
          lastError = "El proxy perdió el contenido de la petición.";
          continue;
        }

        if (!text.includes('methodResponse')) {
          lastError = "Respuesta del servidor no es XML-RPC válido.";
          continue;
        }

        const doc = new DOMParser().parseFromString(text, 'text/xml');
        const fault = doc.querySelector('fault value');
        if (fault) {
          const faultData = parseValue(fault);
          // Si el error viene de Odoo (ExpatError), lo capturamos aquí
          const errorMsg = faultData.faultString || 'Error desconocido';
          if (errorMsg.includes('ExpatError')) {
            lastError = "Odoo recibió la petición pero el cuerpo llegó vacío (Fallo de Proxy).";
            continue;
          }
          throw new Error(`Error de Odoo: ${errorMsg}`);
        }

        const resultNode = doc.querySelector('params param value');
        return resultNode ? parseValue(resultNode) : null;

      } catch (e: any) {
        if (e.message.includes('Error de Odoo:')) throw e;
        lastError = e.message;
        console.warn(`Estrategia ${strategy.name} falló:`, e.message);
      }
    }
    
    throw new Error(`Error de Conexión: ${lastError} Intente recargar la página.`);
  }

  async authenticate(user: string, apiKey: string): Promise<number> {
    const uid = await this.rpcCall('common', 'authenticate', [this.db, user, apiKey, {}]);
    if (typeof uid === 'number') {
      this.uid = uid;
      this.apiKey = apiKey;
      return uid;
    }
    throw new Error("Credenciales corporativas rechazadas.");
  }

  async searchRead(model: string, domain: any[], fields: string[], options: any = {}) {
    if (!this.uid || !this.apiKey) throw new Error("Sesión no autenticada");
    return await this.rpcCall('object', 'execute_kw', [
      this.db, this.uid, this.apiKey,
      model, 'search_read',
      [domain],
      { 
        fields, 
        limit: options.limit || 100, 
        order: options.order || '',
        context: options.context || {}
      }
    ]);
  }

  async create(model: string, values: any, options: any = {}) {
    if (!this.uid || !this.apiKey) throw new Error("Sesión no autenticada");
    return await this.rpcCall('object', 'execute_kw', [
      this.db, this.uid, this.apiKey,
      model, 'create',
      [values],
      { context: options.context || {} }
    ]);
  }

  async getProductsWithStock(locationId: number, search: string = ''): Promise<any[]> {
    const domain: any[] = [['type', '=', 'product']];
    if (search) {
      domain.push('|', ['name', 'ilike', search], ['default_code', '=', search]);
    }
    return await this.searchRead('product.product', domain, 
      ['name', 'default_code', 'qty_available', 'list_price', 'uom_id'], 
      { 
        context: { location: locationId }, 
        limit: 40,
        order: 'qty_available desc'
      }
    );
  }
}
