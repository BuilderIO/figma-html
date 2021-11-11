import { getUrl } from "./url";

interface ImagePaintWithUrl extends ImagePaint {
  url: string;
}

export const getImagePaintWithUrl = ({
  computedStyle,
  el,
}: {
  computedStyle: CSSStyleDeclaration;
  el: Element;
}): ImagePaintWithUrl | undefined => {
  if (el instanceof SVGSVGElement) {
    const url = `data:image/svg+xml,${encodeURIComponent(
      el.outerHTML.replace(/\s+/g, " ")
    )}`;
    if (url) {
      return {
        url,
        type: "IMAGE",
        // TODO: object fit, position
        scaleMode: "FILL",
        imageHash: null,
      };
    }
  } else {
    const baseImagePaint: ImagePaint = {
      type: "IMAGE",
      // TODO: object fit, position
      scaleMode: computedStyle.objectFit === "contain" ? "FIT" : "FILL",
      imageHash: null,
    };

    if (el instanceof HTMLImageElement) {
      const url = el.src;
      if (url) {
        return {
          url,
          ...baseImagePaint,
        };
      }
    } else if (el instanceof HTMLPictureElement) {
      const firstSource = el.querySelector("source");
      if (firstSource) {
        const src = getUrl(firstSource.srcset.split(/[,\s]+/g)[0]);
        // TODO: if not absolute
        if (src) {
          return {
            url: src,
            ...baseImagePaint,
          };
        }
      }
    } else if (el instanceof HTMLVideoElement) {
      const url = el.poster;
      if (url) {
        return {
          url,
          ...baseImagePaint,
        };
      }
    }
  }

  // can this be true _and_ one of the previous IFs?
  // i.e. could an element have a computed bg image and be an SVG/img/picture/video element?
  // probably not, we can likely avoid returning this fill _and_ the previous ones.
  if (
    computedStyle.backgroundImage &&
    computedStyle.backgroundImage !== "none"
  ) {
    const urlMatch = computedStyle.backgroundImage.match(
      /url\(['"]?(.*?)['"]?\)/
    );
    const url = urlMatch?.[1];
    if (url) {
      return {
        url,
        type: "IMAGE",
        // TODO: background size, position
        scaleMode: computedStyle.backgroundSize === "contain" ? "FIT" : "FILL",
        imageHash: null,
      };
    }
  }

  return undefined;
};
