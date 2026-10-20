/**
 * Shrink an image in the browser before upload so it stays well under the
 * request size limit and doesn't bloat the database.
 * Returns a JPEG no larger than `maxSize` on its longest side.
 */
export async function resizeImage(
  file: File,
  maxSize = 1600,
  quality = 0.85
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
  // JPEG has no transparency: paint transparent PNG areas white
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Không xử lý được ảnh"))),
      "image/jpeg",
      quality
    )
  );
}
