// TODO: make private package and import this from the public plugin repo
import { BuilderElement } from "@builder.io/sdk";

export type SizeType = "shrink" | "expand" | "fixed";

export type ComponentType =
  | "row"
  | "stack"
  | "columns"
  | "grid"
  | "canvas"
  | "unknown";

export interface NodeMetaData {
  component?: ComponentType;
  widthType?: SizeType;
  heightType?: SizeType;
}

export const hasChildren = (node: unknown): node is ChildrenMixin =>
  !!(node && (node as any).children);

export const hasConstraints = (node: unknown): node is ConstraintMixin =>
  !!(node && (node as any).constraints);

export const isTextNode = (node: unknown): node is TextNode =>
  !!(node && (node as any).type === "TEXT");

export const isRectangleNode = (node: unknown): node is RectangleNode =>
  !!(node && (node as any).type === "RECTANGLE");

export const isFrameNode = (node: unknown): node is FrameNode =>
  !!(
    node &&
    ((node as any).type === "FRAME" || (node as any).type === "GROUP")
  );

export const isGeometryNode = (node: unknown): node is GeometryMixin =>
  !!(node && (node as any).fills);

export const isImage = (node: unknown): node is GeometryMixin =>
  Boolean(
    isGeometryNode(node) &&
      typeof node.fills !== "symbol" &&
      node.fills.find((item) => item.type === "IMAGE") &&
      getAssumeSizeTypeForNode(node as any, "height") !== "fixed"
  );

export const getImage = (node: unknown) =>
  (isGeometryNode(node) &&
    typeof node.fills !== "symbol" &&
    (node.fills.find((item) => item.type === "IMAGE") as ImagePaint)) ||
  null;

export const getMetadata = (node: SceneNode): NodeMetaData | null => {
  const anyNode = node as any;
  if (anyNode.data) {
    return anyNode.data;
  } else if (node.getSharedPluginData) {
    return (
      JSON.parse(node.getSharedPluginData("builder", "data") || "{}") || {}
    );
  } else {
    return null;
  }
};

export function traverseNode(
  node: SceneNode,
  cb: (node: SceneNode, parent: SceneNode | null) => void,
  _parent: SceneNode | null = null
) {
  cb(node, _parent);
  if (hasChildren(node)) {
    for (const child of node.children) {
      traverseNode(child, cb, node);
    }
  }
}

const el = (options?: Partial<BuilderElement>): BuilderElement => ({
  "@type": "@builder.io/sdk:Element",
  id: "builder-" + Math.random().toString().split(".")[1],
  ...options,
});

const isCenteredX = (node: SceneNode, parent: SceneNode) => {
  if (hasConstraints(node)) {
    if (node.constraints.horizontal === "CENTER") {
      return true;
    }
  }
  return false;
};
const isRightJustified = (node: SceneNode, parent: SceneNode) => {
  if (hasConstraints(node)) {
    if (node.constraints.horizontal === "MAX") {
      return true;
    }
  }
  return false;
};
const isCenteredY = (node: SceneNode, parent: SceneNode) => {
  if (hasConstraints(node)) {
    if (node.constraints.vertical === "CENTER") {
      return true;
    }
  }
  return false;
};
const isBottomJustified = (node: SceneNode, parent: SceneNode) => {
  if (hasConstraints(node)) {
    if (node.constraints.vertical === "MAX") {
      return true;
    }
  }
  return false;
};

const isImageNode = (node: SceneNode) => {
  const image = getImage(node);
  const assumedLayout = getAssumeLayoutTypeForNode(node);
  return image && !isTextNode(node) && assumedLayout !== "columns";
};

const isAbsolute = (node: any) => false;
// Boolean(
//   node && node.data && ["absolute", "fixed"].includes(node.data.position)
// );

export function getCss(node: SceneNode, parent: SceneNode | null) {
  const layout = getAssumeLayoutTypeForNode(node);
  const parentLayout = parent && getAssumeLayoutTypeForNode(parent);
  const useAbsolute = isAbsolute(node); //  parentLayout === "unknown";

  console.log("ya?");

  // parentLayout && ["canvas", "unknown"].includes(parentLayout);

  const numberValue = <T>(thing: T, property: keyof T) => {
    const value = thing[property];
    if (property === "lineHeight") {
      console.log("value", value);
    }
    return typeof value === "string" && value.trim().endsWith("%")
      ? value
      : typeof value === "number"
      ? value + "px"
      : value && typeof (value as any).value === "number"
      ? (value as any).value + ((value as any).unit === "PERCENT" ? "%" : "px")
      : undefined;
  };

  // TODO: top and left margin distances

  const styles: Partial<CSSStyleDeclaration> = {
    display: "flex",
    position: "relative",
    flexShrink: "0",
    flexDirection: "column",
    boxSizing: "border-box",
    ...(isImage(node) &&
      (parentLayout === "stack"
        ? {
            alignSelf: "stretch",
          }
        : parentLayout && "row"
        ? {
            flexGrow: "1",
          }
        : null)),
    ...(layout === "row" && {
      flexDirection: "row",
    }),
    ...(layout === "grid" && {
      flexDirection: "row",
      flexWrap: "wrap",
    }),
    ...(useAbsolute && {
      position: "absolute",
      top: node.y + "px",
      left: node.x + "px",
      width: node.width + "px",
      height: node.height + "px",
    }),
  };

  if (
    (hasChildren(node) &&
      node.children.length === 1 &&
      isCenteredY(node.children[0], node)) ||
    getAssumeSizeTypeForNode(node, "height") === "fixed"
  ) {
    styles.height = node.height + "px";
  }

  if (getAssumeSizeTypeForNode(node, "width") === "shrink") {
    if (hasConstraints(node)) {
      if (node.constraints.horizontal === "MIN") {
        styles.alignSelf = "flex-start";
      } else if (node.constraints.horizontal === "MAX") {
        styles.alignSelf = "flex-end";
      } else {
        styles.alignSelf = "center";
      }
    } else {
      styles.alignSelf = "center";
    }
  }

  if (getAssumeSizeTypeForNode(node, "width") === "fixed") {
    styles.width = node.width + "px";
  }

  if (isRectangleNode(node)) {
    styles.borderRadius = numberValue(node, "cornerRadius");
  }

  if (isGeometryNode(node)) {
    if (node.strokes && node.strokes.length) {
      const stroke = node.strokes[0];
      if (stroke.type === "SOLID") {
        const color = stroke.color;
        const colorString = `rgba(${Math.round(color.r * 255)}, ${Math.round(
          color.g * 255
        )}, ${Math.round(color.b * 255)}, ${
          typeof stroke.opacity === "number" ? stroke.opacity : 1
        })`;
        styles.borderColor = colorString;
      }
      styles.borderWidth = node.strokeWeight + "px";
      styles.borderStyle = "solid";
    }

    if (Array.isArray(node.fills)) {
      (node.fills as Paint[]).forEach((fill) => {
        if (!fill.visible) {
          return;
        }
        if (fill.type === "SOLID") {
          const { color } = fill;
          const colorString = `rgba(${Math.round(color.r * 255)}, ${Math.round(
            color.g * 255
          )}, ${Math.round(color.b * 255)}, ${
            typeof fill.opacity === "number" ? fill.opacity : 1
          })`;
          if (node.type === "TEXT") {
            styles.color = colorString;
          } else {
            styles.backgroundColor = colorString;
          }
        }
        if (fill.type === "IMAGE") {
          if (
            // isTextNode(node) ||
            // getAssumeLayoutTypeForNode(node) === "columns"
            !isImage(node)
          ) {
            const url = (fill as any).url;
            if (url) {
              styles.backgroundImage = `url("${url}")`;
              styles.backgroundSize =
                fill.scaleMode === "FIT" ? "contain" : "cover"; // fill.
              styles.backgroundRepeat = "no-repeat";
              styles.backgroundPosition = "center";
            }
          }
        }
      });
    }
  }

  if (isTextNode(node)) {
    styles.fontSize = numberValue(node, "fontSize");
    styles.lineHeight = numberValue(node, "lineHeight");
    styles.letterSpacing = numberValue(node, "letterSpacing");
    styles.textAlign =
      (node.textAlignHorizontal && node.textAlignHorizontal.toLowerCase()) ||
      undefined;
    // styles.textDecoration = node.textDecoration
    styles.fontFamily =
      (typeof node.fontName !== "symbol" && node.fontName.family) || undefined;
  }

  return styles;
}

const last = <T>(arr: Array<T> | ReadonlyArray<T>) => arr[arr.length - 1];

const sortBy = <T>(arr: Array<T> | ReadonlyArray<T>, fn: (item: T) => any) => {
  return arr.slice().sort((a, b) => {
    const aVal = fn(a);
    const bVal = fn(b);
    return aVal > bVal ? 1 : bVal > aVal ? -1 : 0;
  });
};

export function sortChildren(nodes: SceneNode[]) {
  // TODO: this is wrong for grids
  return sortBy(nodes, (node) => node.x + node.y);
}

function omit<T extends object>(obj: T, ...values: (keyof T)[]): Partial<T> {
  const newObject = Object.assign({}, obj);
  for (const key of values) {
    delete (newObject as any)[key];
  }
  return newObject;
}

export function processBackgroundLayer(node: SceneNode) {
  if (hasChildren(node) && node.children.length) {
    const lastChild = node.children[0];
    if (
      !hasChildren(lastChild) &&
      // OR round these
      Math.abs(lastChild.x) < 1 &&
      Math.abs(lastChild.y) < 1 &&
      Math.abs(lastChild.width - node.width) < 1 &&
      Math.abs(lastChild.height - node.height) < 1 &&
      lastChild.type !== "VECTOR"
    ) {
      const last = (node.children as SceneNode[]).shift()!;
      Object.assign(node, omit(last as any, "type", "children", "constraints"));
    }
  }
}
export function processFillImages(node: SceneNode) {
  if (isGeometryNode(node)) {
    if (typeof node.fills !== "symbol") {
      node.fills.forEach((fill) => {
        if (fill.visible === false) {
          return;
        }
        if (fill.type === "IMAGE" && !(fill as any).url) {
          // const intArr = (fill as any).intArr as Uint8Array | undefined;
          // if (intArr) {
          //   console.log('intArr and no url', fill)
          //   try {
          //     const url =
          //       "data:image/png;base64," + arrayBufferToBase64(intArr);
          //     (fill as any).url = url;
          //   } catch (err) {
          //     console.warn("Could not set background image", node, fill, err);
          //   }
          // } else {
          console.log("No URL on image fill!", fill);
          (fill as any).url =
            "https://cdn.builder.io/api/v1/image/assets%2Fpwgjf0RoYWbdnJSbpBAjXNRMe9F2%2Ffb27a7c790324294af8be1c35fe30f4d";
        }
        // }
      });
    }
  }
}

export interface FigmaToBuilderOptions {
  base64images: boolean;
}

export function figmaToBuilder(
  figmaNode: SceneNode,
  parent?: SceneNode | null,
  options?: FigmaToBuilderOptions
): BuilderElement {
  // TODO: unsafe - be sure to clone this preserving Uint8Array
  const node = figmaNode;

  if (node.type === "VECTOR") {
    node.fills = [
      ...(Array.isArray(node.fills) ? node.fills : []),
      {
        type: "IMAGE",
        ...({
          url:
            "https://cdn.builder.io/api/v1/image/assets%2Fpwgjf0RoYWbdnJSbpBAjXNRMe9F2%2Ffb27a7c790324294af8be1c35fe30f4d",
        } as any),
      },
    ];
  }

  processBackgroundLayer(node);
  processFillImages(node);

  const layout = getAssumeLayoutTypeForNode(node);

  const children =
    hasChildren(node) && sortChildren(node.children as SceneNode[]);
  if (children) {
    (node as any).children = children;
  }

  const image = getImage(node);

  const widths = children && children.map((item) => item.width);
  const allChildWidths = widths && widths.reduce((memo, num) => memo + num, 0);

  return el({
    // id: "builder-" + node.id,
    responsiveStyles: {
      large: getCss(node, parent || null),
    },
    // TODO: maybe put original layer ID in metadata
    layerName: ["Frame", "Rectangle"].includes(node.name)
      ? undefined
      : node.name.length > 30
      ? node.name.substr(0, 30) + "..."
      : "",
    ...({
      meta: {
        figmaLayerId: node.id,
      },
    } as any),
    component: isTextNode(node)
      ? {
          name: "Text",
          options: {
            text: node.characters || "",
          },
        }
      : layout === "columns"
      ? {
          name: "Columns",
          // TODO: gutter var = average distance
          options: {
            // TODO: widths
            space: 10,
            stackColumnsAt: "tablet", // should be 'medium'
            columns:
              children &&
              children.map((child: SceneNode) => ({
                // width: 100 / children.length,
                blocks: [figmaToBuilder(child)],
                width:
                  Math.fround(
                    (child.width / (allChildWidths || node.width)) * 10000
                  ) / 100,
              })),
          },
        }
      : image
      ? // TODO: delete background image if set
        {
          name: "Image",
          options: {
            image: (image as any).url,
            aspectRatio: node.height / node.width,
            backgroundPosition: "center",
            backgroundSize: image.scaleMode === "FIT" ? "contain" : "cover",
          },
        }
      : undefined,
    children:
      children && layout !== "columns"
        ? children.map((child: SceneNode) => figmaToBuilder(child, node))
        : undefined,
  });
}

export function canConvertToBuilder(node: SceneNode) {
  const assumed = getAssumeLayoutTypeForNode(node);
  return Boolean(assumed && assumed !== "unknown");
}

export const collidesVertically = (a: SceneNode, b: SceneNode, margin = 0) =>
  a.y + a.height + margin > b.y && a.y - margin < b.y + b.height;

export const collidesHorizontally = (a: SceneNode, b: SceneNode) =>
  a.x + a.width > b.x && a.x < b.x + b.width;

export function getAssumeSizeTypeForNode(
  node: SceneNode,
  direction: "width" | "height"
): SizeType {
  return "expand";
}

export function getAssumeLayoutTypeForNode(node: SceneNode): ComponentType {
  return "stack";
}
