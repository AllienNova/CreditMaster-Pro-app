export class NextResponse<T = unknown> {
  body: string;
  status: number;

  constructor(body: T, init?: { status?: number }) {
    this.body = typeof body === 'string' ? body : JSON.stringify(body);
    this.status = init?.status ?? 200;
  }

  static json<T>(body: T, init?: { status?: number }): NextResponse<T> {
    return new NextResponse(body, init);
  }

  async json(): Promise<T> {
    return JSON.parse(this.body) as T;
  }
}

export class NextRequest {
  constructor(public readonly url: string = 'http://localhost') {}
}
