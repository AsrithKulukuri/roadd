import https from "node:https";
import http from "node:http";

/**
 * Custom fetch implementation for Node.js server environments.
 * Forces IPv4 network socket resolution (family: 4) to prevent Windows dual-stack socket
 * `AggregateError: (EACCES)` permission errors when connecting to external APIs (e.g. Supabase).
 */
export function ipv4Fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // On Vercel Serverless (Linux/AWS Lambda) or edge runtime, standard native fetch is fully functional
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || typeof https?.request !== "function") {
    return fetch(input, {
      ...init,
      cache: "no-store",
    });
  }

  const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const parsedUrl = new URL(urlString);
  const isHttps = parsedUrl.protocol === "https:";
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (typeof (init.headers as Headers).forEach === "function") {
        (init.headers as Headers).forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        for (const [key, value] of init.headers) {
          headers[key] = value;
        }
      } else {
        Object.assign(headers, init.headers);
      }
    }

    const method = init?.method || "GET";

    const req = client.request(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port ? Number(parsedUrl.port) : isHttps ? 443 : 80,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
        family: 4, // Force IPv4 to prevent Windows EACCES socket failure
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const bodyBuffer = Buffer.concat(chunks);
          const bodyText = bodyBuffer.toString("utf8");

          const responseHeaders = new Headers();
          for (const [key, val] of Object.entries(res.headers)) {
            if (Array.isArray(val)) {
              for (const v of val) responseHeaders.append(key, v);
            } else if (val !== undefined) {
              responseHeaders.set(key, val);
            }
          }

          const response = new Response(bodyBuffer.length > 0 ? bodyBuffer : null, {
            status: res.statusCode || 200,
            statusText: res.statusMessage || "",
            headers: responseHeaders,
          });

          // Safe json() and text() resolvers for empty 201/204 PostgREST responses
          response.json = async () => {
            if (!bodyText || !bodyText.trim()) return null;
            return JSON.parse(bodyText);
          };
          response.text = async () => bodyText;

          resolve(response);
        });
      }
    );

    if (init?.signal) {
      if (init.signal.aborted) {
        req.destroy(new DOMException("The operation was aborted.", "AbortError"));
        reject(new DOMException("The operation was aborted.", "AbortError"));
        return;
      }
      init.signal.addEventListener("abort", () => {
        req.destroy(new DOMException("The operation was aborted.", "AbortError"));
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    }

    req.on("error", (err) => {
      reject(err);
    });

    if (init?.body) {
      if (typeof init.body === "string" || Buffer.isBuffer(init.body)) {
        req.write(init.body);
      } else if (init.body instanceof Uint8Array) {
        req.write(Buffer.from(init.body));
      }
    }

    req.end();
  });
}
