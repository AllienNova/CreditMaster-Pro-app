function timestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function write(level: string, msg: string): void {
  process.stderr.write(`[${timestamp()}] ${level.padEnd(5)} ${msg}\n`);
}

export const log = {
  info: (msg: string) => write("INFO", msg),
  ok: (msg: string) => write("OK", msg),
  fail: (msg: string) => write("FAIL", msg),
  done: (msg: string) => write("DONE", msg),
  warn: (msg: string) => write("WARN", msg),
};
