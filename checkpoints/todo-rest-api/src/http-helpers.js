// Small helpers for reading requests and sending responses, using only Node core.

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const MAX_BODY_BYTES = 10 * 1024; // 10 KB is plenty for a task

/** Sends a JSON response with the right headers */
export function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

/** 204 No Content: success, nothing to send back */
export function sendNoContent(res, headers = {}) {
  res.writeHead(204, headers);
  res.end();
}

export function sendError(res, status, message, details, headers = {}) {
  sendJson(res, status, { error: { status, message, ...(details ? { details } : {}) } }, headers);
}

/**
 * Reads the request body and parses it as JSON.
 * Rejects with HttpError 415 (not JSON), 413 (too big) or 400 (invalid JSON).
 */
export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
      req.resume(); // throw the body away
      reject(new HttpError(415, 'Content-Type must be application/json'));
      return;
    }

    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return; // keep reading so the connection ends cleanly, but don't store it
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (tooLarge) {
        reject(new HttpError(413, `Request body must be at most ${MAX_BODY_BYTES} bytes`));
        return;
      }
      const text = Buffer.concat(chunks).toString('utf8');
      if (text.trim() === '') {
        reject(new HttpError(400, 'Request body is empty, expected JSON'));
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new HttpError(400, 'Request body is not valid JSON'));
      }
    });

    req.on('error', reject);
  });
}
