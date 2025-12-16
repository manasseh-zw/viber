import { createFileRoute } from "@tanstack/react-router";
import { appEnv } from "../lib/env";

type UnsplashPhoto = {
  urls: {
    raw?: string;
    full?: string;
    regular?: string;
    small?: string;
    thumb?: string;
  };
};

type UnsplashSearchResponse = {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
};

const ALLOWED_ORIENTATIONS = new Set(["landscape", "portrait", "squarish"]);
const ALLOWED_COLORS = new Set([
  "black_and_white",
  "black",
  "white",
  "yellow",
  "orange",
  "red",
  "purple",
  "magenta",
  "green",
  "teal",
  "blue",
]);

function normalizeQuery(raw: string | null): string {
  if (!raw) return "";
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized.slice(0, 100);
}

export const Route = createFileRoute("/images")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const rawQuery = url.searchParams.get("q");
          const rawOrientation = url.searchParams.get("orientation");
          const rawColor = url.searchParams.get("color");
          const q = normalizeQuery(rawQuery);

          if (!q) {
            return new Response('Missing "q" query parameter', {
              status: 400,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "public, max-age=60",
              },
            });
          }

          const searchUrl = new URL("https://api.unsplash.com/search/photos");
          searchUrl.searchParams.set("query", q);
          searchUrl.searchParams.set("per_page", "1");
          searchUrl.searchParams.set("content_filter", "high");

          const orientation = rawOrientation
            ? rawOrientation.toLowerCase()
            : undefined;
          if (orientation && ALLOWED_ORIENTATIONS.has(orientation)) {
            searchUrl.searchParams.set("orientation", orientation);
          } else {
            searchUrl.searchParams.set("orientation", "landscape");
          }

          const color = rawColor ? rawColor.toLowerCase() : undefined;
          if (color && ALLOWED_COLORS.has(color)) {
            searchUrl.searchParams.set("color", color);
          }

          const searchResponse = await fetch(searchUrl, {
            headers: {
              Authorization: `Client-ID ${appEnv.UNSPLASH_ACCESS_KEY}`,
              "Accept-Version": "v1",
            },
          });

          if (!searchResponse.ok) {
            console.error("[images] Unsplash search failed", {
              status: searchResponse.status,
              statusText: searchResponse.statusText,
            });

            return new Response("Image search failed", {
              status: 502,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "public, max-age=60",
              },
            });
          }

          const data = (await searchResponse.json()) as UnsplashSearchResponse;

          if (!data.results || data.results.length === 0) {
            return new Response("No image found for query", {
              status: 404,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "public, max-age=300",
              },
            });
          }

          const photo = data.results[0];
          const imageUrl =
            photo.urls.regular || photo.urls.full || photo.urls.raw;

          if (!imageUrl) {
            console.error("[images] Unsplash result missing image URL");
            return new Response("No usable image URL", {
              status: 502,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "public, max-age=300",
              },
            });
          }

          const imageResponse = await fetch(imageUrl);

          if (!imageResponse.ok || !imageResponse.body) {
            console.error("[images] Failed to fetch image bytes", {
              status: imageResponse.status,
              statusText: imageResponse.statusText,
            });

            return new Response("Failed to load image", {
              status: 502,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "public, max-age=300",
              },
            });
          }

          const contentType =
            imageResponse.headers.get("content-type") || "image/jpeg";

          const cacheControl =
            "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

          return new Response(imageResponse.body, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": cacheControl,
            },
          });
        } catch (error) {
          console.error("[images] Unexpected error", {
            error: error instanceof Error ? error.message : String(error),
          });

          return new Response("Internal image service error", {
            status: 500,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "public, max-age=60",
            },
          });
        }
      },
    },
  },
});
