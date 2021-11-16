import { LayerNode, WithRef } from "../types/nodes";
import { Dimensions, Direction } from "./dimensions";
import { traverse } from "./nodes";
import { getRgb, parseBoxShadowStr, parseUnits } from "./parsers";

function setData(
  node: LayerNode & { data?: { [index: string]: string } },
  key: string,
  value: string
) {
  if (!node.data) {
    node.data = {};
  }
  node.data[key] = value;
}

const list: (keyof React.CSSProperties)[] = [
  "opacity",
  "backgroundColor",
  "border",
  "borderTop",
  "borderLeft",
  "borderRight",
  "borderBottom",
  "borderRadius",
  "backgroundImage",
  "borderColor",
  "boxShadow",
];

export function getAppliedComputedStyles(
  element: Element,
  pseudo?: string
): { [key: string]: string } {
  if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
    return {};
  }

  const styles = getComputedStyle(element, pseudo);

  const color = styles.color;

  const defaults: any = {
    transform: "none",
    opacity: "1",
    borderRadius: "0px",
    backgroundImage: "none",
    backgroundPosition: "0% 0%",
    backgroundSize: "auto",
    backgroundColor: "rgba(0, 0, 0, 0)",
    backgroundAttachment: "scroll",
    border: "0px none " + color,
    borderTop: "0px none " + color,
    borderBottom: "0px none " + color,
    borderLeft: "0px none " + color,
    borderRight: "0px none " + color,
    borderWidth: "0px",
    borderColor: color,
    borderStyle: "none",
    boxShadow: "none",
    fontWeight: "400",
    textAlign: "start",
    justifyContent: "normal",
    alignItems: "normal",
    alignSelf: "auto",
    flexGrow: "0",
    textDecoration: "none solid " + color,
    lineHeight: "normal",
    letterSpacing: "normal",
    backgroundRepeat: "repeat",
    zIndex: "auto", // TODO
  };

  function pick<T extends { [key: string]: V }, V = any>(
    object: T,
    paths: (keyof T)[]
  ) {
    const newObject: Partial<T> = {};
    paths.forEach((path) => {
      if (object[path]) {
        if (object[path] !== defaults[path]) {
          newObject[path] = object[path];
        }
      }
    });
    return newObject;
  }

  return pick(styles, list as any) as any;
}

export function addConstraints(layers: LayerNode[]) {
  layers.forEach((layer) => {
    traverse(layer, (child) => {
      if (child.type === "SVG") {
        child.constraints = {
          horizontal: "CENTER",
          vertical: "MIN",
        };
      } else {
        const ref = child.ref;
        if (ref) {
          const el = ref instanceof HTMLElement ? ref : ref.parentElement;
          const parent = el?.parentElement;
          if (el && parent) {
            const currentDisplay = el.style.display;
            el.style.setProperty("display", "none", "!important");
            let computed = getComputedStyle(el);
            const hasFixedWidth = computed?.width.trim().endsWith("px");
            const hasFixedHeight = computed?.height.trim().endsWith("px");
            el.style.display = currentDisplay;
            const parentStyle = getComputedStyle(parent);
            let hasAutoMarginLeft = computed.marginLeft === "auto";
            let hasAutoMarginRight = computed.marginRight === "auto";
            let hasAutoMarginTop = computed.marginTop === "auto";
            let hasAutoMarginBottom = computed.marginBottom === "auto";

            computed = getComputedStyle(el);

            if (["absolute", "fixed"].includes(computed.position!)) {
              setData(child, "position", computed.position!);
            }

            if (hasFixedHeight) {
              setData(child, "heightType", "fixed");
            }
            if (hasFixedWidth) {
              setData(child, "widthType", "fixed");
            }

            const isInline =
              computed.display && computed.display.includes("inline");

            if (isInline) {
              const parentTextAlign = parentStyle.textAlign;
              if (parentTextAlign === "center") {
                hasAutoMarginLeft = true;
                hasAutoMarginRight = true;
              } else if (parentTextAlign === "right") {
                hasAutoMarginLeft = true;
              }

              if (computed.verticalAlign === "middle") {
                hasAutoMarginTop = true;
                hasAutoMarginBottom = true;
              } else if (computed.verticalAlign === "bottom") {
                hasAutoMarginTop = true;
                hasAutoMarginBottom = false;
              }

              setData(child, "widthType", "shrink");
            }
            const parentJustifyContent =
              parentStyle.display === "flex" &&
              ((parentStyle.flexDirection === "row" &&
                parentStyle.justifyContent) ||
                (parentStyle.flexDirection === "column" &&
                  parentStyle.alignItems));

            if (parentJustifyContent === "center") {
              hasAutoMarginLeft = true;
              hasAutoMarginRight = true;
            } else if (
              parentJustifyContent &&
              (parentJustifyContent.includes("end") ||
                parentJustifyContent.includes("right"))
            ) {
              hasAutoMarginLeft = true;
              hasAutoMarginRight = false;
            }

            const parentAlignItems =
              parentStyle.display === "flex" &&
              ((parentStyle.flexDirection === "column" &&
                parentStyle.justifyContent) ||
                (parentStyle.flexDirection === "row" &&
                  parentStyle.alignItems));
            if (parentAlignItems === "center") {
              hasAutoMarginTop = true;
              hasAutoMarginBottom = true;
            } else if (
              parentAlignItems &&
              (parentAlignItems.includes("end") ||
                parentAlignItems.includes("bottom"))
            ) {
              hasAutoMarginTop = true;
              hasAutoMarginBottom = false;
            }

            if (child.type === "TEXT") {
              if (computed.textAlign === "center") {
                hasAutoMarginLeft = true;
                hasAutoMarginRight = true;
              } else if (computed.textAlign === "right") {
                hasAutoMarginLeft = true;
                hasAutoMarginRight = false;
              }
            }

            child.constraints = {
              horizontal:
                hasAutoMarginLeft && hasAutoMarginRight
                  ? "CENTER"
                  : hasAutoMarginLeft
                  ? "MAX"
                  : "SCALE",
              vertical:
                hasAutoMarginBottom && hasAutoMarginTop
                  ? "CENTER"
                  : hasAutoMarginTop
                  ? "MAX"
                  : "MIN",
            };
          }
        } else {
          child.constraints = {
            horizontal: "SCALE",
            vertical: "MIN",
          };
        }
      }
    });
  });
}

export const getBorderRadii = ({
  computedStyle,
}: {
  computedStyle: CSSStyleDeclaration;
}): Partial<
  Pick<
    RectangleNode,
    | "topLeftRadius"
    | "topRightRadius"
    | "bottomLeftRadius"
    | "bottomRightRadius"
  >
> => {
  const topLeft = parseUnits(computedStyle.borderTopLeftRadius);
  const topRight = parseUnits(computedStyle.borderTopRightRadius);
  const bottomRight = parseUnits(computedStyle.borderBottomRightRadius);
  const bottomLeft = parseUnits(computedStyle.borderBottomLeftRadius);

  const borderRadii = {
    ...(topLeft ? { topLeftRadius: topLeft.value } : {}),
    ...(topRight ? { topRightRadius: topRight.value } : {}),
    ...(bottomRight ? { bottomRightRadius: bottomRight.value } : {}),
    ...(bottomLeft ? { bottomLeftRadius: bottomLeft.value } : {}),
  };
  return borderRadii;
};

const capitalize = (str: string) => str[0].toUpperCase() + str.substring(1);

const hasBorder = ({
  borderWidth,
  borderType,
  borderColor,
}: {
  borderWidth: string;
  borderType: string;
  borderColor: string;
}) =>
  borderWidth && borderWidth !== "0" && borderType !== "none" && borderColor;

export function getStrokesRectangle({
  dir,
  rect,
  computedStyle,
  el,
}: {
  dir: Direction;
  rect: Dimensions;
  computedStyle: CSSStyleDeclaration;
  el: Element;
}): WithRef<RectangleNode> | undefined {
  const computed = computedStyle[("border" + capitalize(dir)) as any];
  if (computed) {
    const parsed = computed.match(/^([\d\.]+)px\s*(\w+)\s*(.*)$/);
    if (parsed) {
      const [_match, borderWidth, borderType, borderColor] = parsed;
      if (hasBorder({ borderWidth, borderType, borderColor })) {
        const rgb = getRgb(borderColor);
        if (rgb) {
          const width = ["top", "bottom"].includes(dir)
            ? rect.width
            : parseFloat(borderWidth);
          const height = ["left", "right"].includes(dir)
            ? rect.height
            : parseFloat(borderWidth);
          const fill: SolidPaint = {
            type: "SOLID",
            color: { r: rgb.r, b: rgb.b, g: rgb.g },
            opacity: rgb.a || 1,
          };
          const layer: WithRef<RectangleNode> = {
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
            fills: [fill],
          };

          return layer;
        }
      }
    }
  }

  return undefined;
}

export const addStrokesFromBorder = ({
  computedStyle: { border },
}: {
  computedStyle: CSSStyleDeclaration;
}): Pick<RectangleNode, "strokes" | "strokeWeight"> | undefined => {
  if (border) {
    const parsed = border.match(/^([\d\.]+)px\s*(\w+)\s*(.*)$/);
    if (parsed) {
      const [_match, borderWidth, borderType, borderColor] = parsed;
      if (hasBorder({ borderWidth, borderType, borderColor })) {
        const rgb = getRgb(borderColor);
        if (rgb) {
          return {
            strokes: [
              {
                type: "SOLID",
                color: { r: rgb.r, b: rgb.b, g: rgb.g },
                opacity: rgb.a || 1,
              },
            ],
            strokeWeight: Math.round(parseFloat(borderWidth)),
          };
        }
      }
    }
  }
  return undefined;
};
export const getShadowEffects = ({
  computedStyle: { boxShadow },
}: {
  computedStyle: CSSStyleDeclaration;
}): ShadowEffect[] | undefined => {
  if (boxShadow && boxShadow !== "none") {
    const parsed = parseBoxShadowStr(boxShadow);
    const color = getRgb(parsed.color);
    if (color) {
      const shadowEffect: ShadowEffect = {
        color,
        type: "DROP_SHADOW",
        radius: parsed.blurRadius,
        blendMode: "NORMAL",
        visible: true,
        offset: {
          x: parsed.offsetX,
          y: parsed.offsetY,
        },
      };
      return [shadowEffect];
    }
  }

  return undefined;
};
