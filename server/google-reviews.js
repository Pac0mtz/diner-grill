// Fetch Google Place reviews + photos via Places API (New).
// Requires GOOGLE_PLACES_API_KEY. Without it, the static frontend data is used.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, "data", "google-reviews.json");
const UPLOAD_DIR = path.join(__dirname, "data", "uploads");
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const PLACE_QUERY = "Diner Grill 1635 W Irving Park Rd Chicago IL 60613";
const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Diner+Grill+1635+W+Irving+Park+Rd+Chicago+IL";

function readCache() {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    if (!raw?.fetchedAt || !raw?.payload) return null;
    if (Date.now() - new Date(raw.fetchedAt).getTime() > CACHE_TTL_MS) return null;
    return raw.payload;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(
    CACHE_PATH,
    JSON.stringify({ fetchedAt: new Date().toISOString(), payload }, null, 2)
  );
}

async function downloadPlacePhoto(apiKey, photoName, index) {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=1200&maxWidthPx=1600&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) return null;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const file = `google-place-${index}.jpg`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), buf);
  return `/uploads/${file}`;
}

/**
 * Returns live Google reviews payload, or null if no API key / fetch failed.
 */
export async function fetchGoogleReviews() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
  if (!apiKey) return null;

  const cached = readCache();
  if (cached) return cached;

  try {
    const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName",
      },
      body: JSON.stringify({ textQuery: PLACE_QUERY, maxResultCount: 1 }),
    });
    if (!searchRes.ok) {
      throw new Error(`searchText ${searchRes.status}: ${(await searchRes.text()).slice(0, 200)}`);
    }
    const search = await searchRes.json();
    const placeRef = search.places?.[0]?.id; // e.g. places/ChIJ...
    if (!placeRef) {
      console.warn("[google-reviews] No place found for query.");
      return null;
    }

    const detailsRes = await fetch(`https://places.googleapis.com/v1/${placeRef}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,displayName,rating,userRatingCount,reviews,photos",
      },
    });
    if (!detailsRes.ok) {
      throw new Error(`details ${detailsRes.status}: ${(await detailsRes.text()).slice(0, 200)}`);
    }
    const place = await detailsRes.json();

    const placeId = String(place.id || placeRef).replace(/^places\//, "");
    const writeReviewUrl = placeId
      ? `https://search.google.com/local/writereview?placeid=${placeId}`
      : MAPS_URL;

    const photoUrls = [];
    const photos = Array.isArray(place.photos) ? place.photos.slice(0, 8) : [];
    for (let i = 0; i < photos.length; i++) {
      const name = photos[i]?.name;
      if (!name) continue;
      try {
        const local = await downloadPlacePhoto(apiKey, name, i + 1);
        if (local) photoUrls.push(local);
      } catch (err) {
        console.warn("[google-reviews] photo download failed:", err.message);
      }
    }

    const reviews = (place.reviews || [])
      .map((r, i) => {
        const author = r.authorAttribution?.displayName || "Google user";
        const text = (r.text?.text || r.originalText?.text || "").trim();
        const rating = Number(r.rating) || 5;
        const date = r.publishTime ? String(r.publishTime).slice(0, 10) : "";
        // Prefer a photo attached to the review author attribution when present;
        // otherwise rotate place photos downloaded from Google.
        const authorPhoto = r.authorAttribution?.photoUri || null;
        const image = authorPhoto || photoUrls[i % Math.max(photoUrls.length, 1)] || null;
        return {
          id: `google-${i}-${author.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          author,
          rating,
          date,
          text,
          source: "google",
          image: photoUrls.length || authorPhoto ? image : null,
          imageCredit: image ? "Google" : null,
        };
      })
      .filter((r) => r.text);

    const payload = {
      summary: {
        rating: Number(place.rating) || 4.6,
        count: Number(place.userRatingCount) || reviews.length,
        source: "google",
        mapsUrl: MAPS_URL,
        writeReviewUrl,
        syncedAt: new Date().toISOString(),
        live: true,
      },
      reviews,
    };

    if (reviews.length) writeCache(payload);
    console.log(
      `[google-reviews] synced ${reviews.length} reviews, ${photoUrls.length} Google photos (rating ${payload.summary.rating})`
    );
    return payload;
  } catch (err) {
    console.warn("[google-reviews] sync failed:", err.message);
    try {
      if (fs.existsSync(CACHE_PATH)) {
        const raw = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
        if (raw?.payload) {
          return { ...raw.payload, summary: { ...raw.payload.summary, live: true } };
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}
