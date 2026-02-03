
/**
 * Odoo XML-RPC Client - Versión Ultra-Robusta
 * Basado en el motor de conexión proporcionado por el usuario.
 * Resuelve errores 403 Forbidden y CORS mediante múltiples estrategias de proxy.
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
  private useProxy: boolean = false;

  constructor(private url: string, private db: string, useProxy: boolean = false) {
    this.useProxy = useProxy;
    this.url = this.url.replace(/\/+$/, '').replace('http://', 'https://');
  }

  setProxy(active: boolean) {
    this.useProxy = active;
  }

  async rpcCall(endpoint: string, methodName: string, params: any[]) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><methodCall><methodName>${methodName}</methodName><params>${params.map(p => `<param>${serialize(p)}</param>`).join('')}</params></methodCall>`;
    const odooUrl = `${this.url}/xmlrpc/2/${endpoint}`;
    
    // Estrategias de conexión basadas en tu archivo
    const strategies = [
      { 
        name: 'CORSProxy.io',
        use: true,
        call: async () => fetch(`https://corsproxy.io/?${encodeURIComponent(odooUrl)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body: xml
        })
      },
      {
        name: 'AllOrigins',
        use: true,
        call: async () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(odooUrl)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body: xml
        })
      },
      {
        name: 'Direct Connection',
        use: !this.useProxy, // Solo intentamos directo si no se forzó el proxy
        call: async () => fetch(odooUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body: xml
        })
      }
    ].filter(s => s.use);

    let lastError: any = null;

    for (const strategy of strategies) {
      try {
        const response = await strategy.call();

        if (!response.ok) {
          lastError = new Error(`${strategy.name} status ${response.status}`);
          continue;
        }

        const text = await response.text();
        
        if (!text || text.includes('xml.parsers.expat.ExpatError')) {
          lastError = new Error(`${strategy.name} falló al procesar el XML en Odoo.`);
          continue;
        }

        if (!text.includes('methodResponse')) {
          lastError = new Error(`Respuesta inválida de ${strategy.name}`);
          continue;
        }

        const doc = new DOMParser().parseFromString(text, 'text/xml');
        const fault = doc.querySelector('fault value');
        if (fault) {
          const faultData = parseValue(fault);
          throw new Error(`Odoo: ${faultData.faultString || 'Error Desconocido'}`);
        }

        const resultNode = doc.querySelector('params param value');
        return resultNode ? parseValue(resultNode) : null;

      } catch (e: any) {
        if (e.message.startsWith('Odoo:')) throw e;
        lastError = e;
        console.warn(`Fallo con ${strategy.name}:`, e.message);
      }
    }
    
    // Marcamos el error como ERROR_CORS para que App.tsx sepa que debe reintentar con proxy si falló directo
    throw new Error(`ERROR_CORS: No se pudo conectar a Odoo tras varios intentos. Detalle: ${lastError?.message}`);
  }

  async authenticate(user: string, apiKey: string): Promise<number> {
    const uid = await this.rpcCall('common', 'authenticate', [this.db, user, apiKey, {}]);
    if (typeof uid === 'number') {
      this.uid = uid;
      this.apiKey = apiKey;
      return uid;
    }
    throw new Error("Credenciales inválidas en Odoo.");
  }

  async searchRead(model: string, domain: any[], fields: string[], options: any = {}) {
    if (!this.uid || !this.apiKey) throw new Error("Sesión no iniciada");
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
    if (!this.uid || !this.apiKey) throw new Error("Sesión no iniciada");
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
