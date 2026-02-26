/**
 * Compress an image File to a JPEG base64 data-URL
 * Target: 300 × 200 px, JPEG quality 0.38 → roughly 15–30 KB in base64.
 * Keeps the aspect ratio; never upscales smaller images.
 */
export function compressImage(file, maxW = 300, maxH = 200, quality = 0.38) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.round(img.width  * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
