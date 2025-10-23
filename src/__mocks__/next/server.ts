export class NextResponse {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
  }

  static json(body, init) {
    return new NextResponse(JSON.stringify(body), init);
  }

  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
}

export class NextRequest {}
