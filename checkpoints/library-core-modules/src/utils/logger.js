// A tiny logger. Where the lines go (output) is injected, so tests can
// collect them in an array instead of printing to the console.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

export function createLogger({ level = 'info', output = console, prefix = '' } = {}) {
  const min = LEVELS[level] ?? LEVELS.info;
  const tag = prefix ? `[${prefix}] ` : '';

  const write = (lvl, method) => (...args) => {
    if (LEVELS[lvl] >= min) output[method](`${tag}${args.join(' ')}`);
  };

  return Object.freeze({
    debug: write('debug', 'log'),
    info: write('info', 'log'),
    warn: write('warn', 'warn'),
    error: write('error', 'error'),
    /** Same output and level, different prefix */
    child: (childPrefix) =>
      createLogger({ level, output, prefix: prefix ? `${prefix}:${childPrefix}` : childPrefix }),
  });
}

export const silentLogger = createLogger({ level: 'silent' });

/** Logger that stores lines in memory, handy for tests */
export function createMemoryLogger(level = 'debug') {
  const lines = [];
  const output = { log: (l) => lines.push(l), warn: (l) => lines.push(l), error: (l) => lines.push(l) };
  // The logger object is frozen, so copy its methods into a new object with "lines"
  return { ...createLogger({ level, output }), lines };
}
