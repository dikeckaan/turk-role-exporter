const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const UPSTREAM_URL = "https://amatortelsizcilik.com.tr/roleler/data.json";
const CACHE_TTL = 600; // seconds

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Route: GET /api/roleler
    if (request.method === "GET" && url.pathname === "/api/roleler") {
      return handleRoleler(request, ctx);
    }

    // Unknown path
    return new Response(JSON.stringify({ hata: "Bulunamadi" }), {
      status: 404,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    });
  },
};

async function handleRoleler(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(UPSTREAM_URL, { method: "GET" });

  // Check cache first
  const cached = await cache.match(cacheKey);
  if (cached) {
    const cachedResponse = new Response(cached.body, cached);
    cachedResponse.headers.set("Access-Control-Allow-Origin", "*");
    cachedResponse.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    cachedResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return cachedResponse;
  }

  // Fetch from upstream
  let upstreamResponse;
  try {
    upstreamResponse = await fetch(UPSTREAM_URL, {
      headers: {
        "User-Agent": "RoleExporter-Worker/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return new Response(
        JSON.stringify({ hata: "Kaynak sunucu zaman asimina ugradi" }),
        {
          status: 504,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
          },
        }
      );
    }
    return new Response(
      JSON.stringify({ hata: "Kaynak sunucuya erisilemiyor" }),
      {
        status: 502,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (!upstreamResponse.ok) {
    return new Response(
      JSON.stringify({ hata: "Kaynak sunucuya erisilemiyor" }),
      {
        status: 502,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Validate JSON
  let bodyText;
  try {
    bodyText = await upstreamResponse.text();
    JSON.parse(bodyText); // validate
  } catch {
    return new Response(JSON.stringify({ hata: "Gecersiz veri formati" }), {
      status: 502,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    });
  }

  // Build response to cache and return
  const responseToCache = new Response(bodyText, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_TTL}`,
    },
  });

  // Store in cache (use waitUntil if available, otherwise put synchronously)
  if (ctx?.waitUntil) {
    ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));
  } else {
    await cache.put(cacheKey, responseToCache.clone());
  }

  return new Response(bodyText, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_TTL}`,
    },
  });
}
