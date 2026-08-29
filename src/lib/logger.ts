import { getRequestId } from './request-context.ts';

type LogLevel = 'success' | 'fail' | 'warn' | 'info' | 'debug';

interface PaintInput {
  color: string;
  text: string;
}

interface FormatLogInput {
  level: LogLevel;
  message: string;
  detail: string | null;
}

interface LogInput {
  level: LogLevel;
  message: string;
  detail?: string | null;
}

export interface LoggerMessageInput<Thrown = never> {
  message: string;
  detail?: string | null;
  error?: Thrown;
}

export interface ErrorDetailInput {
  error: Error;
}

const iconByLevel: Record<LogLevel, string> = {
  success: '✅',
  fail: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  debug: '🔎',
};

const labelByLevel: Record<LogLevel, string> = {
  success: 'PASS',
  fail: 'FAIL',
  warn: 'WARN',
  info: 'INFO',
  debug: 'DEBUG',
};

// These are terminal color codes, not CSS. They tell the terminal "print this in green/red/…".
// `\u001b` is the Escape character; `[0m` means "go back to normal text".
const colorByLevel: Record<LogLevel, string> = {
  success: '\u001b[32m',
  fail: '\u001b[31m',
  warn: '\u001b[33m',
  info: '\u001b[36m',
  debug: '\u001b[90m',
};

const reset = '\u001b[0m';
const dim = '\u001b[2m';

const paint = ({ color, text }: PaintInput): string => {
  // `process.stdout` is this program's output stream (like `console`, but the raw pipe).
  // `isTTY` means "are we printing to a real terminal?". If logs go to a file/CI, skip colors.
  if (!process.stdout.isTTY) {
    return text;
  }

  return `${color}${text}${reset}`;
};

const timestamp = (): string => new Date().toISOString();

const formatLog = ({ level, message, detail }: FormatLogInput): string => {
  const requestId = getRequestId();
  const requestField = requestId ? `  requestId=${requestId}` : '';
  const header = `${iconByLevel[level]}  ${labelByLevel[level].padEnd(5)}  ${paint({ color: dim, text: timestamp() })}${requestField}`;
  const title = paint({ color: colorByLevel[level], text: header });
  const body = `${title}  ${message}`;

  if (!detail) {
    return body;
  }

  return `${body}  ${paint({ color: dim, text: detail })}`;
};

const write = ({ level, message, detail }: FormatLogInput): void => {
  const formatted = `${formatLog({ level, message, detail })}\n`;

  if (level === 'fail' || level === 'warn') {
    process.stderr.write(formatted);
    return;
  }

  process.stdout.write(formatted);
};

const log = ({ level, message, detail = null }: LogInput): void => {
  write({ level, message, detail });
};

interface AppStackFrameInput {
  stack: string;
}

// A stack trace is Node's list of "this function called that function".
// We skip `node_modules` and keep the first line under `src/` so logs show our file, not Mongoose internals.
const appStackFrame = ({ stack }: AppStackFrameInput): string | null => {
  const srcMarker = '/src/';
  const lines = stack.split('\n');

  for (const line of lines) {
    if (line.includes('node_modules')) {
      continue;
    }

    const srcIndex = line.indexOf(srcMarker);
    if (srcIndex === -1) {
      continue;
    }

    const fromSrc = line.slice(srcIndex + 1);
    const closingParen = fromSrc.indexOf(')');
    if (closingParen === -1) {
      return fromSrc;
    }

    return fromSrc.slice(0, closingParen);
  }

  return null;
};

const errorDetail = ({ error }: ErrorDetailInput): string => {
  if (!error.stack) {
    return error.message;
  }

  const file = appStackFrame({ stack: error.stack });
  if (!file) {
    return error.message;
  }

  return `${error.message}\n    ${file}`;
};

const resolveLogDetail = <Thrown>({
  detail = null,
  error,
}: LoggerMessageInput<Thrown>): string | null => {
  // `catch` can throw anything. We only print a stack when the value is actually an `Error`.
  if (error instanceof Error) {
    const fromError = errorDetail({ error });

    if (!detail) {
      return fromError;
    }

    return `${detail}\n    ${fromError}`;
  }

  return detail;
};

export const logger = {
  success: <Thrown>(input: LoggerMessageInput<Thrown>): void => {
    log({ level: 'success', message: input.message, detail: resolveLogDetail(input) });
  },
  fail: <Thrown>(input: LoggerMessageInput<Thrown>): void => {
    log({ level: 'fail', message: input.message, detail: resolveLogDetail(input) });
  },
  warn: <Thrown>(input: LoggerMessageInput<Thrown>): void => {
    log({ level: 'warn', message: input.message, detail: resolveLogDetail(input) });
  },
  info: <Thrown>(input: LoggerMessageInput<Thrown>): void => {
    log({ level: 'info', message: input.message, detail: resolveLogDetail(input) });
  },
  debug: <Thrown>(input: LoggerMessageInput<Thrown>): void => {
    log({ level: 'debug', message: input.message, detail: resolveLogDetail(input) });
  },
};
