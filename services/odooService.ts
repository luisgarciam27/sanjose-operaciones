
/**
 * Odoo XML-RPC Client - Versión Edge Proxy
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
    
    const odooTargetUrl = `${this.url}/xmlrpc/2/${endpoint}`;
    
    if (this.onStatusChange) this.onStatusChange(`Conectando con el servidor San José...`);

    try {
      // Usamos el proxy con URL absoluta para evitar ambigüedades en Vercel
      const proxyUrl = `${window.location.origin}/api/odoo-proxy`;
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: odooTargetUrl,
          body: xmlBody
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del Servidor Proxy (${response.status})`);
      }

      const text = await response.text();
      
      if (!text.includes('methodResponse')) {
        throw new Error("Respuesta de Odoo inválida o vacía.");
      }

      const doc = new DOMParser().parseFromString(text, 'text/xml');
      const fault = doc.querySelector('fault value');
      if (fault) {
        const faultData = parseValue(fault);
        throw new Error(`Odoo: ${faultData.faultString || 'Error desconocido'}`);
      }

      const resultNode = doc.querySelector('params param value');
      return resultNode ? parseValue(resultNode) : null;

    } catch (e: any) {
      if (e.message === 'Failed to fetch') {
        throw new Error("No se pudo contactar con el Proxy de Vercel. Verifique que la función api/odoo-proxy esté desplegada.");
      }
      throw e;
    }
  }

  async authenticate(user: string, apiKey: string): Promise<number> {
    const uid = await this.rpcCall('common', 'authenticate', [this.db, user, apiKey, {}]);
    if (typeof uid === 'number') {
      this.uid = uid;
      this.apiKey = apiKey;
      return uid;
    }
    throw new Error("Credenciales inválidas.");
  }

  async searchRead(model: string, domain: any[], fields: string[], options: any = {}) {
    if (!this.uid || !this.apiKey) throw new Error("No autenticado.");
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
