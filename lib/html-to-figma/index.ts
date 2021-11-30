import { getBoundingClientRect } from "./helpers/dimensions";
import { getImagePaintWithUrl } from "./helpers/image";
import { isHidden, textNodesUnder, traverse } from "./helpers/nodes";
import { size } from "./helpers/object";
import { getRgb } from "./helpers/parsers";
import {
  addStrokesFromBorder,
  getStrokesRectangle,
  getAppliedComputedStyles,
  getShadowEffects,
  getBorderRadii,
} from "./helpers/styles";
import { createSvgLayer, processSvgUseElements } from "./helpers/svg";
import { buildTextNode } from "./helpers/text";
import { getLayersForFrames } from "./helpers/frames";
import { LayerNode, WithRef } from "./types/nodes";

const generateElements = (el: Element) => {
  const getShadowEls = (el: Element): Element[] =>
    Array.from(el.shadowRoot?.querySelectorAll("*") || []).reduce(
      (memo, el) => [...memo, el, ...getShadowEls(el)],
      [] as Element[]
    );

  const els = Array.from(el.querySelectorAll("*")).reduce(
    (memo, el) => [...memo, el, ...getShadowEls(el)],
    [] as Element[]
  );

  return els;
};

function removeRefs({
  layers,
  root,
}: {
  layers: LayerNode[];
  root: WithRef<FrameNode>;
}) {
  layers.concat([root]).forEach((layer) => {
    traverse(layer, (child) => {
      delete child.ref;
    });
  });
}

const getLayersForElement = (el: Element) => {
  const elementLayers: LayerNode[] = [];
  if (isHidden(el)) {
    return [];
  }
  if (el instanceof SVGSVGElement) {
    elementLayers.push(createSvgLayer(el));
    return elementLayers;
  }
  // Sub SVG Eleemnt
  else if (el instanceof SVGElement) {
    return [];
  }

  // for `picture`, we only need the `image` element. We can ignore the parent `picture` and
  // `source` sibling elements.
  if (
    (el.parentElement instanceof HTMLPictureElement &&
      el instanceof HTMLSourceElement) ||
    el instanceof HTMLPictureElement
  ) {
    return [];
  }

  // TO-DO: what does `appliedStyles` do here? All we do is check that it's non-empty
  const appliedStyles = getAppliedComputedStyles(el);

  const computedStyle = getComputedStyle(el);

  if (
    (size(appliedStyles) ||
      el instanceof HTMLImageElement ||
      el instanceof HTMLVideoElement) &&
    computedStyle.display !== "none"
  ) {
    const rect = getBoundingClientRect(el);

    if (rect.width >= 1 && rect.height >= 1) {
      const fills: Paint[] = [];

      const color = getRgb(computedStyle.backgroundColor);

      if (color) {
        const solidPaint: SolidPaint = {
          type: "SOLID",
          color: {
            r: color.r,
            g: color.g,
            b: color.b,
          },
          opacity: color.a || 1,
        };
        fills.push(solidPaint);
      }

      const rectNode: WithRef<RectangleNode> = {
        type: "RECTANGLE",
        ref: el,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        fills,
      };

      const strokes = addStrokesFromBorder({ computedStyle });

      if (strokes) {
        Object.assign(rectNode, strokes);
      }

      if (!rectNode.strokes) {
        for (const dir of ["top", "left", "right", "bottom"] as const) {
          const strokesLayer = getStrokesRectangle({
            dir,
            rect,
            computedStyle,
            el,
          });

          if (strokesLayer) {
            elementLayers.push(strokesLayer);
          }
        }
      }
      const imagePaint = getImagePaintWithUrl({ computedStyle, el });

      if (imagePaint) {
        fills.push(imagePaint);
        rectNode.name = "IMAGE";
      }

      const shadowEffects = getShadowEffects({ computedStyle });

      if (shadowEffects) {
        rectNode.effects = shadowEffects;
      }

      const borderRadii = getBorderRadii({ computedStyle });
      Object.assign(rectNode, borderRadii);

      elementLayers.push(rectNode);
    }
  }

  return elementLayers;
};

export function htmlToFigma(
  selector: HTMLElement | string = "body",
  useFrames = false,
  time = false
) {
  if (time) {
    console.time("Parse dom");
  }
  const layers: LayerNode[] = [];
  const el =
    selector instanceof HTMLElement
      ? selector
      : document.querySelector(selector || "body");

  if (el) {
    processSvgUseElements(el);

    const els = generateElements(el);

    els.forEach((el) => {
      const elLayers = getLayersForElement(el);
      layers.push(...elLayers);
    });

    const textNodes = textNodesUnder(el);

    for (const node of textNodes) {
      const textNode = buildTextNode({ node });
      if (textNode) {
        layers.push(textNode);
      }
    }
  }

  // TODO: send frame: { children: []}
  const root: WithRef<FrameNode> = {
    type: "FRAME",
    width: Math.round(window.innerWidth),
    height: Math.round(document.documentElement.scrollHeight),
    x: 0,
    y: 0,
    ref: document.body,
  };

  layers.unshift(root);

  const framesLayers = useFrames
    ? getLayersForFrames({ layers, root })
    : layers;

  removeRefs({ layers: framesLayers, root });

  if (time) {
    console.info("\n");
    console.timeEnd("Parse dom");
  }

  return framesLayers;
}
