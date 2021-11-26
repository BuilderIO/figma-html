/**
 * Figma's `figma.createImage()` only accepts PNG, JPEG and GIF. We therefore need to transform webp images.
 * This code is borrowed from https://www.figma.com/plugin-docs/working-with-images/
 */
export const transformWebpToPNG = async (bytes: Uint8Array) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const imageData = await decode(canvas, ctx, bytes);
  const newBytes = await encode(canvas, ctx, imageData);
  return newBytes;
};

// Encoding an image is also done by sticking pixels in an
// HTML canvas and by asking the canvas to serialize it into
// an actual PNG file via canvas.toBlob().
function encode(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  imageData: ImageData
) {
  ctx.putImageData(imageData, 0, 0);
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();

      reader.onload = () =>
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(new Error("Could not read from blob"));
      reader.readAsArrayBuffer(blob!);
    });
  });
}

// Decoding an image can be done by sticking it in an HTML
// canvas, as we can read individual pixels off the canvas.
async function decode(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  bytes: Uint8Array
) {
  const url = URL.createObjectURL(new Blob([bytes]));
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject();
    img.src = url;
  });
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  return imageData;
}
