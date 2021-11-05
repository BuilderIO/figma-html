import { getBoundingClientRect } from "./helpers/dimensions";
import {
  getDepth,
  getParents,
  hasChildren,
  isHidden,
  textNodesUnder,
  traverse,
} from "./helpers/nodes";
import { fastClone, size } from "./helpers/object";
import { getRgb, parseUnits, parseBoxShadowStr } from "./helpers/parsers";
import {
  addConstraints,
  getAppliedComputedStyles,
  setBorderRadii,
} from "./helpers/styles";
import { getUrl } from "./helpers/url";
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

            if (computedStyle.border) {
              const parsed = computedStyle.border.match(
                /^([\d\.]+)px\s*(\w+)\s*(.*)$/
              );
              if (parsed) {
                let [_match, width, type, color] = parsed;
                if (width && width !== "0" && type !== "none" && color) {
                  const rgb = getRgb(color);
                  if (rgb) {
                    rectNode.strokes = [
                      {
                        type: "SOLID",
                        color: { r: rgb.r, b: rgb.b, g: rgb.g },
                        opacity: rgb.a || 1,
                      },
                    ];
                    rectNode.strokeWeight = Math.round(parseFloat(width));
                  }
                }
              }
            }

            if (!rectNode.strokes) {
              const capitalize = (str: string) =>
                str[0].toUpperCase() + str.substring(1);
              const directions = ["top", "left", "right", "bottom"] as const;
              for (const dir of directions) {
                const computed =
                  computedStyle[("border" + capitalize(dir)) as any];
                if (computed) {
                  const parsed = computed.match(/^([\d\.]+)px\s*(\w+)\s*(.*)$/);
                  if (parsed) {
                    let [_match, borderWidth, type, color] = parsed;
                    if (
                      borderWidth &&
                      borderWidth !== "0" &&
                      type !== "none" &&
                      color
                    ) {
                      const rgb = getRgb(color);
                      if (rgb) {
                        const width = ["top", "bottom"].includes(dir)
                          ? rect.width
                          : parseFloat(borderWidth);
                        const height = ["left", "right"].includes(dir)
                          ? rect.height
                          : parseFloat(borderWidth);
                        layers.push({
                          ref: el,
                          type: "RECTANGLE",
                          x:
                            dir === "left"
                              ? rect.left - width
                              : dir === "right"
                              ? rect.right
                              : rect.left,
                          y:
                            dir === "top"
                              ? rect.top - height
                              : dir === "bottom"
                              ? rect.bottom
                              : rect.top,
                          width,
                          height,
                          fills: [
                            {
                              type: "SOLID",
                              color: { r: rgb.r, b: rgb.b, g: rgb.g },
                              opacity: rgb.a || 1,
                            } as SolidPaint,
                          ] as any,
                        } as WithRef<RectangleNode>);
                      }
                    }
                  }
                }
              }
            }

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
                  // TODO: backround size, position
                  scaleMode:
                    computedStyle.backgroundSize === "contain" ? "FIT" : "FILL",
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

            if (computedStyle.boxShadow && computedStyle.boxShadow !== "none") {
              const parsed = parseBoxShadowStr(computedStyle.boxShadow);
              const color = getRgb(parsed.color);
              if (color) {
                rectNode.effects = [
                  {
                    color,
                    type: "DROP_SHADOW",
                    radius: parsed.blurRadius,
                    blendMode: "NORMAL",
                    visible: true,
                    offset: {
                      x: parsed.offsetX,
                      y: parsed.offsetY,
                    },
                  } as ShadowEffect,
                ];
              }
            }

            setBorderRadii({ computedStyle, rectNode });

            layers.push(rectNode);
          }
        }
      });
    }

    const textNodes = textNodesUnder(el);

    for (const node of textNodes) {
      if (node.textContent && node.textContent.trim().length) {
        const parent = node.parentElement;
        if (parent) {
          if (isHidden(parent)) {
            continue;
          }
          const computedStyles = getComputedStyle(parent);
          const range = document.createRange();
          range.selectNode(node);
          const rect = fastClone(range.getBoundingClientRect());
          const lineHeight = parseUnits(computedStyles.lineHeight);
          range.detach();
          if (lineHeight && rect.height < lineHeight.value) {
            const delta = lineHeight.value - rect.height;
            rect.top -= delta / 2;
            rect.height = lineHeight.value;
          }
          if (rect.height < 1 || rect.width < 1) {
            continue;
          }

          const textNode = {
            x: Math.round(rect.left),
            ref: node,
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            type: "TEXT",
            characters: node.textContent.trim().replace(/\s+/g, " ") || "",
          } as WithRef<TextNode>;

          const fills: SolidPaint[] = [];
          const rgb = getRgb(computedStyles.color);

          if (rgb) {
            fills.push({
              type: "SOLID",
              color: {
                r: rgb.r,
                g: rgb.g,
                b: rgb.b,
              },
              opacity: rgb.a || 1,
            } as SolidPaint);
          }

          if (fills.length) {
            textNode.fills = fills;
          }
          const letterSpacing = parseUnits(computedStyles.letterSpacing);
          if (letterSpacing) {
            textNode.letterSpacing = letterSpacing;
          }

          if (lineHeight) {
            textNode.lineHeight = lineHeight;
          }

          const { textTransform } = computedStyles;
          switch (textTransform) {
            case "uppercase": {
              textNode.textCase = "UPPER";
              break;
            }
            case "lowercase": {
              textNode.textCase = "LOWER";
              break;
            }
            case "capitalize": {
              textNode.textCase = "TITLE";
              break;
            }
          }

          const fontSize = parseUnits(computedStyles.fontSize);
          if (fontSize) {
            textNode.fontSize = Math.round(fontSize.value);
          }
          if (computedStyles.fontFamily) {
            // const font = computedStyles.fontFamily.split(/\s*,\s*/);
            (textNode as any).fontFamily = computedStyles.fontFamily;
          }

          if (computedStyles.textDecoration) {
            if (
              computedStyles.textDecoration === "underline" ||
              computedStyles.textDecoration === "strikethrough"
            ) {
              textNode.textDecoration =
                computedStyles.textDecoration.toUpperCase() as any;
            }
          }
          if (computedStyles.textAlign) {
            if (
              ["left", "center", "right", "justified"].includes(
                computedStyles.textAlign
              )
            ) {
              textNode.textAlignHorizontal =
                computedStyles.textAlign.toUpperCase() as any;
            }
          }

          layers.push(textNode);
        }
      }
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

  function makeTree() {
    function getParent(layer: LayerNode) {
      let response: LayerNode | null = null;
      try {
        traverse(root, (child) => {
          if (
            child &&
            (child as any).children &&
            (child as any).children.includes(layer)
          ) {
            response = child;
            // Deep traverse short circuit hack
            throw "DONE";
          }
        });
      } catch (err) {
        if (err === "DONE") {
          // Do nothing
        } else {
          console.error(err instanceof Error ? err.message : err);
        }
      }
      return response;
    }

    const refMap = new WeakMap<Element | Node, LayerNode>();
    layers.forEach((layer) => {
      if (layer.ref) {
        refMap.set(layer.ref, layer);
      }
    });

    let updated = true;
    let iterations = 0;
    while (updated) {
      updated = false;
      if (iterations++ > 10000) {
        console.error("Too many tree iterations 1");
        break;
      }

      traverse(root, (layer, originalParent) => {
        // const node = layer.ref!;
        const node = layer.ref;
        let parentElement: Element | null =
          (node && (node as Element).parentElement) || null;
        do {
          if (parentElement === document.body) {
            break;
          }
          if (parentElement && parentElement !== document.body) {
            // Get least common demoninator shared parent and make a group
            const parentLayer = refMap.get(parentElement);
            if (parentLayer === originalParent) {
              break;
            }
            if (parentLayer && parentLayer !== root) {
              if (hasChildren(parentLayer)) {
                if (originalParent) {
                  const index = (originalParent as any).children.indexOf(layer);
                  (originalParent as any).children.splice(index, 1);
                  (parentLayer.children as Array<any>).push(layer);
                  updated = true;
                  return;
                }
              } else {
                let parentRef = parentLayer.ref;
                if (
                  parentRef &&
                  parentRef instanceof Node &&
                  parentRef.nodeType === Node.TEXT_NODE
                ) {
                  parentRef = parentRef.parentElement as Element;
                }
                const overflowHidden =
                  parentRef instanceof Element &&
                  getComputedStyle(parentRef).overflow !== "visible";
                const newParent: LayerNode = {
                  type: "FRAME",
                  clipsContent: !!overflowHidden,
                  // type: 'GROUP',
                  x: parentLayer.x,
                  y: parentLayer.y,
                  width: parentLayer.width,
                  height: parentLayer.height,
                  ref: parentLayer.ref,
                  backgrounds: [] as any,
                  children: [parentLayer, layer] as any[],
                };

                const parent = getParent(parentLayer);
                if (!parent) {
                  console.warn(
                    "\n\nCANT FIND PARENT\n",
                    JSON.stringify({ ...parentLayer, ref: null })
                  );
                  continue;
                }
                if (originalParent) {
                  const index = (originalParent as any).children.indexOf(layer);
                  (originalParent as any).children.splice(index, 1);
                }
                delete parentLayer.ref;
                const newIndex = (parent as any).children.indexOf(parentLayer);
                refMap.set(parentElement, newParent);
                (parent as any).children.splice(newIndex, 1, newParent);
                updated = true;
                return;
              }
            }
          }
        } while (
          parentElement &&
          (parentElement = parentElement.parentElement)
        );
      });
    }
    // Collect tree of depeest common parents and make groups
    let secondUpdate = true;
    let secondIterations = 0;
    while (secondUpdate) {
      if (secondIterations++ > 10000) {
        console.error("Too many tree iterations 2");
        break;
      }
      secondUpdate = false;

      traverse(root, (layer, parent) => {
        if (secondUpdate) {
          return;
        }
        if (layer.type === "FRAME") {
          // Final all child elements with layers, and add groups around  any with a shared parent not shared by another
          const ref = layer.ref as Element;
          if (layer.children && layer.children.length > 2) {
            const childRefs =
              layer.children &&
              (layer.children as LayerNode[]).map((child) => child.ref!);

            let lowestCommonDenominator = layer.ref!;
            let lowestCommonDenominatorDepth = getDepth(
              lowestCommonDenominator
            );

            // Find lowest common demoninator with greatest depth
            for (const childRef of childRefs) {
              const otherChildRefs = childRefs.filter(
                (item) => item !== childRef
              );
              const childParents = getParents(childRef);
              for (const otherChildRef of otherChildRefs) {
                const otherParents = getParents(otherChildRef);
                for (const parent of otherParents) {
                  if (
                    childParents.includes(parent) &&
                    layer.ref!.contains(parent)
                  ) {
                    const depth = getDepth(parent);
                    if (depth > lowestCommonDenominatorDepth) {
                      lowestCommonDenominator = parent;
                      lowestCommonDenominatorDepth = depth;
                    }
                  }
                }
              }
            }
            if (
              lowestCommonDenominator &&
              lowestCommonDenominator !== layer.ref
            ) {
              // Make a group around all children elements
              const newChildren = layer.children!.filter((item: any) =>
                lowestCommonDenominator.contains(item.ref)
              );

              if (newChildren.length !== layer.children.length) {
                const lcdRect = getBoundingClientRect(
                  lowestCommonDenominator as Element
                );

                const overflowHidden =
                  lowestCommonDenominator instanceof Element &&
                  getComputedStyle(lowestCommonDenominator).overflow !==
                    "visible";

                const newParent: LayerNode = {
                  type: "FRAME",
                  clipsContent: !!overflowHidden,
                  ref: lowestCommonDenominator as Element,
                  x: lcdRect.left,
                  y: lcdRect.top,
                  width: lcdRect.width,
                  height: lcdRect.height,
                  backgrounds: [] as any,
                  children: newChildren as any,
                };
                refMap.set(lowestCommonDenominator, ref);
                let firstIndex = layer.children.length - 1;
                for (const child of newChildren) {
                  const childIndex = layer.children.indexOf(child as any);
                  if (childIndex > -1 && childIndex < firstIndex) {
                    firstIndex = childIndex;
                  }
                }
                (layer.children as any).splice(firstIndex, 0, newParent);
                for (const child of newChildren) {
                  const index = layer.children.indexOf(child);
                  if (index > -1) {
                    (layer.children as any).splice(index, 1);
                  }
                }
                secondUpdate = true;
              }
            }
          }
        }
      });
    }
    // Update all positions
    traverse(root, (layer) => {
      if (layer.type === "FRAME" || (layer as any).type === "GROUP") {
        const { x, y } = layer;
        if (x || y) {
          traverse(layer, (child) => {
            if (child === layer) {
              return;
            }
            child.x = child.x! - x!;
            child.y = child.y! - y!;
          });
        }
      }
    });
  }

  function removeRefs(layers: LayerNode[]) {
    layers.concat([root]).forEach((layer) => {
      traverse(layer, (child) => {
        delete child.ref;
      });
    });
  }

  // TODO: arg can be passed in
  const MAKE_TREE = useFrames;
  if (MAKE_TREE) {
    (root as any).children = layers.slice(1);
    makeTree();
    addConstraints([root]);
    removeRefs([root]);
    if (time) {
      console.info("\n");
      console.timeEnd("Parse dom");
    }
    return [root];
  }

  removeRefs(layers);

  if (time) {
    console.info("\n");
    console.timeEnd("Parse dom");
  }

  return layers;
}
