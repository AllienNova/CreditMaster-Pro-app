interface ResponseInit {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
}

export class NextResponse {
  body: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;

  constructor(body?: string | null, init?: ResponseInit) {
    this.body = body || '';
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.headers = init?.headers || {};
  }

  static json<T>(body: T, init?: ResponseInit): NextResponse {
    return new NextResponse(JSON.stringify(body), init);
  }

  json<T>(): Promise<T> {
    return Promise.resolve(JSON.parse(this.body) as T);
  }
}

interface NextRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export class NextRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;

  constructor(url: string, init?: NextRequestInit) {
    this.url = url;
    this.method = init?.method || 'GET';
    this.headers = init?.headers || {};
    this.body = init?.body || null;
  }

  json<T>(): Promise<T> {
    return Promise.resolve(JSON.parse(this.body || '{}') as T);
  }
}
