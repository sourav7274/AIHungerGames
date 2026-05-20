import { inspect } from "util";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";

function timeStamp(): string {
  const d = new Date();
  return d.toLocaleTimeString();
}

function fmtArg(a: any): string {
  if (typeof a === "string") {
    return a.replace(/\s*\n\s*/g, " ").trim();
  }
  return inspect(a, { depth: 2, colors: false, compact: true });
}

function joinArgs(args: any[]): string {
  return args.map(fmtArg).filter(Boolean).join(" ");
}

const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);
const originalInfo = console.info.bind(console);

console.log = (...args: any[]) => {
  try {
    const msg = joinArgs(args);
    originalLog(`${DIM}[${timeStamp()}]${RESET} ${msg}`);
  } catch (e) {
    originalLog(...args);
  }
};

console.info = (...args: any[]) => {
  try {
    const msg = joinArgs(args);
    originalInfo(`${CYAN}[${timeStamp()}] INFO:${RESET} ${msg}`);
  } catch (e) {
    originalInfo(...args);
  }
};

console.warn = (...args: any[]) => {
  try {
    const msg = joinArgs(args);
    originalWarn(`${YELLOW}[${timeStamp()}] WARN:${RESET} ${msg}`);
  } catch (e) {
    originalWarn(...args);
  }
};

console.error = (...args: any[]) => {
  try {
    const msg = joinArgs(args);
    originalError(`${RED}[${timeStamp()}] ERROR:${RESET} ${msg}`);
  } catch (e) {
    originalError(...args);
  }
};

// keep a reference so other modules can detect our presence
(console as any)._prettyLogger = true;
