
/**
 * Odoo XML-RPC Client - Versión Ultra-Robusta para Producción
 * Específicamente diseñada para superar bloqueos de cuerpo vacío en proxies.
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
  private forceProxy: boolean = true;

  constructor(private url: string, private db: string, initialProxy: boolean = true) {
    this.forceProxy = initialProxy;
    this.url = this.url.replace(/\/+$/, '');
  }

  public setProxy(val: boolean) {
    this.forceProxy = val;
  }

  async rpcCall(endpoint: string, methodName: string, params: any[]) {
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><methodCall><methodName>${methodName}</methodName><params>${params.map(p => `<param>${serialize(p)}</param>`).join('')}</params></methodCall>`;
    
    // Usamos Blob para asegurar que el navegador trate el body como contenido estructurado
    const bodyBlob = new Blob([xmlBody], { type: 'text/xml' });
    const odooUrl = `${this.url}/xmlrpc/2/${endpoint}`;
    
    const strategies = [
      { 
        name: 'Proxy SJS', 
        url: `https://corsproxy.io/?${encodeURIComponent(odooUrl)}`,
        active: true
      },
      { 
        name: 'Proxy Secundario', 
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(odooUrl)}`,
        active: true
      }
    ];

    let lastError: string = "";

    for (const strategy of strategies) {
      try {
        console.log(`[Odoo] Intentando vía ${strategy.name}...`);
        const response = await fetch(strategy.url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'text/xml',
            'Accept': 'text/xml',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: bodyBlob,
          mode: 'cors'
        });

        if (!response.ok) {
          lastError = `HTTP ${response.status}`;
          continue;
        }

        const text = await response.text();
        if (!text || !text.includes('methodResponse')) {
          lastError = "Respuesta no válida";
          continue;
        }

        const doc = new DOMParser().parseFromString(text, 'text/xml');
        const fault = doc.querySelector('fault value');
        if (fault) {
          const faultData = parseValue(fault);
          throw new Error(`Odoo RPC: ${faultData.faultString || 'Error desconocido'}`);
        }

        const resultNode = doc.querySelector('params param value');
        return resultNode ? parseValue(resultNode) : null;

      } catch (e: any) {
        if (e.message.includes('Odoo RPC:')) throw e;
        lastError = e.message;
        console.warn(`Fallo en ${strategy.name}:`, e.message);
      }
    }
    
    throw new Error(`No se pudo conectar al servidor San José. Por favor, revise su conexión o intente más tarde. (${lastError})`);
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
