import { LayerNode } from "../types/nodes";

export const processSvgUseElements = (el: Element) => {
  // Process SVG <use> elements
  for (const use of Array.from(el.querySelectorAll("use"))) {
    try {
      const symbolSelector = use.href.baseVal;
      const symbol: SVGSymbolElement | null =
        document.querySelector(symbolSelector);
      if (symbol) {
        use.outerHTML = symbol.innerHTML;
      }
    } catch (err) {
      console.warn("Error querying <use> tag href", err);
    }
  }
};

export const createSvgLayer = (el: SVGSVGElement) => {
  const rect = el.getBoundingClientRect();

  // TODO: pull in CSS/computed styles
  // TODO: may need to pull in layer styles too like shadow, bg color, etc
  const layer: LayerNode = {
    type: "SVG",
    ref: el,
    svg: el.outerHTML,
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };

  return layer;
};
