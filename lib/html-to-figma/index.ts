import { getBoundingClientRect } from "./helpers/dimensions";
import { addImagePaintLayer } from "./helpers/image";
import { isHidden, textNodesUnder, traverse } from "./helpers/nodes";
import { size } from "./helpers/object";
import { getRgb } from "./helpers/parsers";
import {
  addConstraints,
  addStrokesFromBorder,
  addStrokesFromIndividualBorders,
  getAppliedComputedStyles,
  getShadowEffects,
  setBorderRadii,
} from "./helpers/styles";
import { buildTextNode } from "./helpers/text";
import { makeTree } from "./helpers/tree";
import { LayerNode, WithRef } from "./types/nodes";

const processSvgUseElements = (el: Element) => {
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

const generateElements = (el: Element) => {
  const getShadowEls = (el: Element): Element[] =>
    Array.from(
      el.shadowRoot?.querySelectorAll("*") || ([] as Element[])
    ).reduce((memo, el) => {
      memo.push(el);
      memo.push(...getShadowEls(el));
      return memo;
    }, [] as Element[]);

  const els = Array.from(el.querySelectorAll("*")).reduce((memo, el) => {
    memo.push(el);
    memo.push(...getShadowEls(el));
    return memo;
  }, [] as Element[]);

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

    if (els) {
      Array.from(els).forEach((el) => {
        if (isHidden(el)) {
          return;
        }
        if (el instanceof SVGSVGElement) {
          const rect = el.getBoundingClientRect();

          // TODO: pull in CSS/computed styles
          // TODO: may need to pull in layer styles too like shadow, bg color, etc
          layers.push({
            type: "SVG",
            ref: el,
            svg: el.outerHTML,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
          return;
        }
        // Sub SVG Eleemnt
        else if (el instanceof SVGElement) {
          return;
        }

        if (
          el.parentElement &&
          el.parentElement instanceof HTMLPictureElement
        ) {
          return;
        }

        const appliedStyles = getAppliedComputedStyles(el);
        const computedStyle = getComputedStyle(el);

        if (
          (size(appliedStyles) ||
            el instanceof HTMLImageElement ||
            el instanceof HTMLPictureElement ||
            el instanceof HTMLVideoElement) &&
          computedStyle.display !== "none"
        ) {
          const rect = getBoundingClientRect(el);

          if (rect.width >= 1 && rect.height >= 1) {
            const fills: Paint[] = [];

            const color = getRgb(computedStyle.backgroundColor);

            if (color) {
              fills.push({
                type: "SOLID",
                color: {
                  r: color.r,
                  g: color.g,
                  b: color.b,
                },
                opacity: color.a || 1,
              } as SolidPaint);
            }

            const rectNode = {
              type: "RECTANGLE",
              ref: el,
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              fills: fills as any,
            } as WithRef<RectangleNode>;

            addStrokesFromBorder({ computedStyle, rectNode });

            if (!rectNode.strokes) {
              for (const dir of ["top", "left", "right", "bottom"] as const) {
                addStrokesFromIndividualBorders({
                  dir,
                  rect,
                  computedStyle,
                  layers,
                  el,
                });
              }
            }
            addImagePaintLayer({ computedStyle, fills, el });

            const shadowEffects = getShadowEffects({ computedStyle });

            if (shadowEffects) {
              rectNode.effects = shadowEffects;
            }

            setBorderRadii({ computedStyle, rectNode });

            layers.push(rectNode);
          }
        }
      });
    }

    const textNodes = textNodesUnder(el);

    for (const node of textNodes) {
      buildTextNode({ node, layers });
    }
  }

  // TODO: send frame: { children: []}
  const root = {
    type: "FRAME",
    width: Math.round(window.innerWidth),
    height: Math.round(document.documentElement.scrollHeight),
    x: 0,
    y: 0,
    ref: document.body,
  } as WithRef<FrameNode>;

  layers.unshift(root);

  if (useFrames) {
    (root as any).children = layers.slice(1);
    makeTree({ root, layers });
    addConstraints([root]);
    removeRefs({ layers: [root], root });
    if (time) {
      console.info("\n");
      console.timeEnd("Parse dom");
    }
    return [root];
  }

  removeRefs({ layers, root });

  if (time) {
    console.info("\n");
    console.timeEnd("Parse dom");
  }

  return layers;
}
