const sharp = require('sharp');

/** Tamaño máximo del archivo original antes de procesar (6 MB). */
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

/** Lado máximo en píxeles (la imagen se escala dentro de este cuadro, sin recortar). */
const MAX_EDGE_PX = 1280;

/** WebP: buen balance peso/calidad para referencia visual. */
const WEBP_QUALITY = 82;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function isAllowedMime(mime) {
  return mime && ALLOWED_MIME.has(String(mime).toLowerCase());
}

/**
 * Rota según EXIF, redimensiona si hace falta, convierte a WebP.
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
async function procesarBufferAWebp(buffer) {
  return sharp(buffer)
    .rotate()
    .resize(MAX_EDGE_PX, MAX_EDGE_PX, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

module.exports = {
  MAX_UPLOAD_BYTES,
  MAX_EDGE_PX,
  WEBP_QUALITY,
  isAllowedMime,
  procesarBufferAWebp,
};
