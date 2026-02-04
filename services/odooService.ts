
/**
 * Odoo XML-RPC Client - Optimizado para Vercel Edge
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
    
    if (this.onStatusChange) this.onStatusChange(`Conectando con San José...`);

    try {
      const response = await fetch('/api/odoo-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: odooTargetUrl, body: xmlBody })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Error de Red (${response.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorJson.details || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
      }

      const text = await response.text();
      if (!text || !text.includes('methodResponse')) {
        throw new Error("Respuesta inválida del servidor central.");
      }

      const doc = new DOMParser().parseFromString(text, 'text/xml');
      const fault = doc.querySelector('fault value');
      if (fault) {
        const faultData = parseValue(fault);
        throw new Error(`Error Odoo: ${faultData.faultString || 'Error desconocido'}`);
      }

      const resultNode = doc.querySelector('params param value');
      return resultNode ? parseValue(resultNode) : null;

    } catch (e: any) {
      console.error("[OdooRPC] Error:", e.message);
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
    throw new Error("Acceso denegado: Credenciales no válidas.");
  }

  async searchRead(model: string, domain: any[], fields: string[], options: any = {}) {
    if (!this.uid || !this.apiKey) throw new Error("Sesión no iniciada.");
    return await this.rpcCall('object', 'execute_kw', [
      this.db, this.uid, this.apiKey,
      model, 'search_read',
      [domain],
      { fields, limit: options.limit || 80, order: options.order || 'id desc' }
    ]);
  }

  async create(model: string, values: any) {
    if (!this.uid || !this.apiKey) throw new Error("Sesión no iniciada.");
    return await this.rpcCall('object', 'execute_kw', [
      this.db, this.uid, this.apiKey,
      model, 'create',
      [values]
    ]);
  }

  async getProductsWithStock(locationId: number, search: string = ''): Promise<any[]> {
    const domain: any[] = [['type', '=', 'product']];
    if (search) domain.push('|', ['name', 'ilike', search], ['default_code', 'ilike', search]);
    
    return await this.searchRead('product.product', domain, 
      ['name', 'default_code', 'qty_available', 'list_price', 'uom_id'], 
      { context: { location: locationId }, limit: 40 }
    );
  }
}
