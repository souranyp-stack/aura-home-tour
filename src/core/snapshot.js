// Encodes a canvas to a compact image held by the browser and returns its URL:
// WebP where the browser can write it, JPEG where it can't (Safari). A WebGL
// canvas must be captured in the same task that rendered it, and toBlob takes
// its copy of the pixels at the moment it is called.
const probe = document.createElement('canvas');
probe.width = probe.height = 1;
const type = probe.toDataURL('image/webp').includes('webp') ? 'image/webp' : 'image/jpeg';

export const snapshot = (canvas) => new Promise((resolve) => {
  canvas.toBlob((blob) => resolve(URL.createObjectURL(blob)), type, 0.84);
});
