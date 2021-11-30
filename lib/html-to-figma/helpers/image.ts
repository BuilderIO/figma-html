import { getUrl } from "./url";

export const addImagePaintLayer = ({
  computedStyle,
  el,
  fills,
}: {
  computedStyle: CSSStyleDeclaration;
  fills: Paint[];
  el: Element;
}) => {
  if (
    computedStyle.backgroundImage &&
    computedStyle.backgroundImage !== "none"
  ) {
    const urlMatch = computedStyle.backgroundImage.match(
      /url\(['"]?(.*?)['"]?\)/
    );
    const url = urlMatch?.[1];
    if (url) {
      fills.push({
        url,
        type: "IMAGE",
        // TODO: background size, position
        scaleMode: computedStyle.backgroundSize === "contain" ? "FIT" : "FILL",
        imageHash: null,
      } as ImagePaint);
    }
  }
  if (el instanceof SVGSVGElement) {
    const url = `data:image/svg+xml,${encodeURIComponent(
      el.outerHTML.replace(/\s+/g, " ")
    )}`;
    if (url) {
      fills.push({
        url,
        type: "IMAGE",
        // TODO: object fit, position
        scaleMode: "FILL",
        imageHash: null,
      } as ImagePaint);
    }
  }

  const baseImagePaint = {
    type: "IMAGE",
    // TODO: object fit, position
    scaleMode: computedStyle.objectFit === "contain" ? "FIT" : "FILL",
    imageHash: null,
  };

  if (el instanceof HTMLImageElement) {
    const url = el.src;
    if (url) {
      fills.push({
        url,
        ...baseImagePaint,
      } as ImagePaint);
    }
  }
  if (el instanceof HTMLPictureElement) {
    const firstSource = el.querySelector("source");
    if (firstSource) {
      const src = getUrl(firstSource.srcset.split(/[,\s]+/g)[0]);
      // TODO: if not absolute
      if (src) {
        fills.push({
          url: src,
          ...baseImagePaint,
        } as ImagePaint);
      }
    }
  }
  if (el instanceof HTMLVideoElement) {
    const url = el.poster;
    if (url) {
      fills.push({
        url,
        ...baseImagePaint,
      } as ImagePaint);
    }
  }
};
