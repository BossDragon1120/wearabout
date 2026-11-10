// WearAbout — keep faces private from the AI services.
// Before a fit photo goes to Anthropic or Photoroom, faces are found on the phone and covered with a coarse mosaic.
// When Photoroom sends back a backdrop, the real face is put back from the original photo, on the phone.
// Face finding uses Google's MediaPipe face detector (the "full range" model, made for people a few meters away),
// loaded from a CDN the first time someone adds a fit.

const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/";
let detectorP = null, queue = Promise.resolve();

function loadScript(src) {
  return new Promise((res, rej) => {
    if (window.FaceDetection) return res();
    const s = document.createElement("script");
    s.src = src; s.crossOrigin = "anonymous"; s.onload = () => res(); s.onerror = () => rej(new Error("Couldn't load face finder"));
    document.head.appendChild(s);
  });
}
async function detector() {
  if (!detectorP) {
    detectorP = (async () => {
      await loadScript(MP + "face_detection.js");
      const fd = new window.FaceDetection({ locateFile: (f) => MP + f });
      fd.setOptions({ model: "full", minDetectionConfidence: 0.45 });
      await fd.initialize();
      return fd;
    })();
    detectorP.catch(() => { detectorP = null; });
  }
  return detectorP;
}
// Start downloading early (e.g. when the photo picker opens), so it's ready when the photo arrives.
export function warmFaces() { detector().catch(() => {}); }

function canvasOf(src, maxEdge) {
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, s = Math.min(1, maxEdge / Math.max(w, h));
  const c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); return c;
}
async function detectOn(canvas) {
  const fd = await detector();
  // The detector reports through one callback, so run one image at a time.
  const run = () => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("Face finder timed out")), 15000);
    fd.onResults((r) => { clearTimeout(t); res((r.detections || []).map((d) => d.boundingBox)); });
    fd.send({ image: canvas }).catch((e) => { clearTimeout(t); rej(e); });
  });
  const p = queue.then(run, run); queue = p.catch(() => {}); return p;
}

// Faces as boxes in 0..1 image coordinates: {x, y, w, h} (top-left corner).
// Also looks in the top part of the photo at higher detail, where a small face in a full-length shot usually is.
export async function findFaces(img) {
  const full = canvasOf(img, 1280), W = full.width, H = full.height;
  const boxes = [];
  const add = (bb, ox, oy, sw, sh) => {
    const w = bb.width * sw, h = bb.height * sh, x = ox + bb.xCenter * sw - w / 2, y = oy + bb.yCenter * sh - h / 2;
    if (w <= 0 || h <= 0) return;
    for (const b of boxes) {   // skip a face already found
      const ix = Math.max(0, Math.min(b.x + b.w, x + w) - Math.max(b.x, x)), iy = Math.max(0, Math.min(b.y + b.h, y + h) - Math.max(b.y, y));
      if (ix * iy > 0.3 * Math.min(b.w * b.h, w * h)) return;
    }
    boxes.push({ x, y, w, h });
  };
  for (const bb of await detectOn(full)) add(bb, 0, 0, 1, 1);
  // Upper half, as a square crop, at full detail.
  const side = Math.min(W, Math.round(H * 0.5)), cx = Math.round((W - side) / 2);
  const crop = document.createElement("canvas"); crop.width = crop.height = 640;
  crop.getContext("2d").drawImage(full, cx, 0, side, side, 0, 0, 640, 640);
  for (const bb of await detectOn(crop)) add(bb, cx / W, 0, side / W, side / H);
  return boxes;
}

// The area to cover: an oval just inside the face box (eyes, nose, mouth), so it stays on the face itself.
// Keeping it tight means the real face can later be laid back over it without bringing any old background along.
function coverArea(b, W, H) {
  return { cx: (b.x + b.w / 2) * W, cy: (b.y + b.h / 2) * H, rx: b.w * W * 0.58, ry: b.h * H * 0.64 };
}

// A copy of the photo with each face covered by a coarse mosaic (about 5 blocks across), as a canvas.
export function maskFaces(img, boxes, maxEdge = 1600) {
  const c = canvasOf(img, maxEdge), g = c.getContext("2d"), W = c.width, H = c.height;
  for (const b of boxes) {
    const a = coverArea(b, W, H), x0 = Math.max(0, a.cx - a.rx), y0 = Math.max(0, a.cy - a.ry);
    const w = Math.min(W - x0, a.rx * 2), h = Math.min(H - y0, a.ry * 2);
    if (w < 2 || h < 2) continue;
    const t = document.createElement("canvas"); t.width = 5; t.height = Math.max(5, Math.round(5 * h / w));
    const tg = t.getContext("2d"); tg.imageSmoothingEnabled = true; tg.drawImage(c, x0, y0, w, h, 0, 0, t.width, t.height);
    g.save(); g.beginPath(); g.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI * 2); g.clip();
    g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, t.width, t.height, x0, y0, w, h); g.restore();
  }
  return c;
}

/* ---- putting the real face back into a backdrop ---- */
function gray(c, x, y, w, h, n) {
  const t = document.createElement("canvas"); t.width = n; t.height = n;
  const g = t.getContext("2d", { willReadFrequently: true }); g.drawImage(c, x, y, w, h, 0, 0, n, n);
  const d = g.getImageData(0, 0, n, n).data, out = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) out[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
  return out;
}
function ncc(a, b) {
  let ma = 0, mb = 0; for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; } ma /= a.length; mb /= b.length;
  let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; n += x * y; da += x * x; db += y * y; }
  return da && db ? n / Math.sqrt(da * db) : 0;
}
function meanRGB(c, x, y, w, h) {
  const g = c.getContext("2d", { willReadFrequently: true });
  x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y)); w = Math.max(1, Math.min(c.width - x, Math.round(w))); h = Math.max(1, Math.min(c.height - y, Math.round(h)));
  const d = g.getImageData(x, y, w, h).data; let r = 0, gg = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 16) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
  return [r / n, gg / n, b / n];
}

// result: the backdrop image Photoroom returned (made from the masked photo, same framing as the original).
// original: the unmasked photo. masked: the canvas that was sent. Returns a canvas with the real faces back,
// or null if a face can't be lined up confidently (then the caller keeps the original photo instead).
export function restoreFaces(result, original, masked, boxes) {
  const R = canvasOf(result, 4000), RW = R.width, RH = R.height;
  const O = document.createElement("canvas"); O.width = RW; O.height = RH; O.getContext("2d").drawImage(original, 0, 0, RW, RH);
  const M = masked;
  const g = R.getContext("2d");
  for (const b of boxes) {
    // Where the face is in the masked photo, then where it should be in the result (same framing, maybe a different size).
    const am = coverArea(b, M.width, M.height), ar = coverArea(b, RW, RH);
    const bw = am.rx * 2, bh = am.ry * 2, n = 24;
    const tpl = gray(M, am.cx - am.rx, am.cy - am.ry, bw, bh, n);
    const sx = RW / M.width, sy = RH / M.height;
    // Look around the expected spot for the best match, in case the photo shifted a little.
    let best = { s: -2, dx: 0, dy: 0 };
    const step = Math.max(1, Math.round(ar.rx / 8)), span = Math.round(ar.rx * 0.6);
    for (let dy = -span; dy <= span; dy += step) for (let dx = -span; dx <= span; dx += step) {
      const s = ncc(tpl, gray(R, ar.cx - ar.rx + dx, ar.cy - ar.ry + dy, bw * sx, bh * sy, n));
      if (s > best.s) best = { s, dx, dy };
    }
    if (best.s < 0.55) return null;
    const cx = ar.cx + best.dx, cy = ar.cy + best.dy, rx = ar.rx, ry = ar.ry;
    // Match the lighting Photoroom applied: compare the middle of the mosaic before and after.
    const core = (C, x, y, kx, ky) => meanRGB(C, x - rx * 0.5 * kx, y - ry * 0.5 * ky, rx * kx, ry * ky);
    const mo = core(M, am.cx, am.cy, 1 / sx, 1 / sy), mr = core(R, cx, cy, 1, 1);
    const gain = mo.map((v, i) => Math.min(1.35, Math.max(0.75, v > 8 ? mr[i] / v : 1)));
    // Cut the real face from the original with soft edges, adjust its light, and lay it over the mosaic.
    const pw = Math.ceil(rx * 2.3), ph = Math.ceil(ry * 2.3), px = cx - pw / 2, py = cy - ph / 2;
    const p = document.createElement("canvas"); p.width = pw; p.height = ph;
    const pg = p.getContext("2d", { willReadFrequently: true });
    pg.drawImage(O, ar.cx - pw / 2, ar.cy - ph / 2, pw, ph, 0, 0, pw, ph);
    const id = pg.getImageData(0, 0, pw, ph), d = id.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, d[i] * gain[0]); d[i + 1] = Math.min(255, d[i + 1] * gain[1]); d[i + 2] = Math.min(255, d[i + 2] * gain[2]); }
    pg.putImageData(id, 0, 0);
    pg.globalCompositeOperation = "destination-in";
    pg.save(); pg.translate(pw / 2, ph / 2); pg.scale(1, ry / rx);
    const grad = pg.createRadialGradient(0, 0, rx * 1.0, 0, 0, rx * 1.12);
    grad.addColorStop(0, "rgba(0,0,0,1)"); grad.addColorStop(1, "rgba(0,0,0,0)");
    pg.fillStyle = grad; pg.fillRect(-pw, -ph * rx / ry, pw * 2, ph * 2 * rx / ry); pg.restore();
    g.drawImage(p, px, py);
  }
  return R;
}
