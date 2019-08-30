import { BuilderElement } from "@builder.io/sdk";
import { arrayBufferToBase64 } from "./functions/buffer-to-base64";
type ComponentType =
  | "row"
  | "stack"
  | "columns"
  | "grid"
  | "canvas"
  | "unknown";
interface NodeMetaData {
  component?: ComponentType;
}

export const hasChildren = (node: unknown): node is ChildrenMixin =>
  !!(node && (node as any).children);

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
      node.fills.find(item => item.type === "IMAGE")
  );

export const getImage = (node: unknown) =>
  (isGeometryNode(node) &&
    typeof node.fills !== "symbol" &&
    (node.fills.find(item => item.type === "IMAGE") as ImagePaint)) ||
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
      cb(child, node);
    }
  }
}

const el = (options?: Partial<BuilderElement>): BuilderElement => ({
  "@type": "@builder.io/sdk:Element",
  id:
    "builder-" +
    Math.random()
      .toString()
      .split(".")[1],
  ...options
});

export function getCss(node: SceneNode, parent: SceneNode | null) {
  const layout = getAssumeLayoutTypeForNode(node);
  const useAbsolute =
    parent &&
    ["canvas", "unknown"].includes(getAssumeLayoutTypeForNode(parent));

  const numberValue = <T>(thing: T, property: keyof T) =>
    typeof thing[property] === "number" ? thing[property] + "px" : undefined;

  const image = getImage(node);

  // TODO: top and left margin distances

  const styles: Partial<CSSStyleDeclaration> = {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    ...(layout === "stack" && {
      flexDirection: "column"
    }),
    ...(layout === "grid" && {
      flexWrap: "wrap"
    }),
    ...(useAbsolute && {
      position: "absolute",
      top: node.y + "px",
      left: node.x + "px",
      width: node.width + "px",
      height: node.height + "px"
    })
  };

  if (isRectangleNode(node)) {
    styles.borderRadius = numberValue(node, "cornerRadius");
  }

  if (isGeometryNode(node)) {
    if (Array.isArray(node.fills)) {
      (node.fills as Paint[]).forEach(fill => {
        if (!fill.visible) {
          return;
        }
        if (fill.type === "SOLID") {
          const { color } = fill;
          const colorString = `rgba(${color.r * 255}, ${color.g *
            255}, ${color.b * 255}, ${fill.opacity})`;
          if (node.type === "TEXT") {
            styles.color = colorString;
          } else {
            styles.backgroundColor = colorString;
          }
        }
        if (fill.type === "IMAGE") {
          const url = (fill as any).url;
          if (url) {
            // const buffer = intArr.buffer;
            // TODO: upload to Builder
            styles.backgroundImage = `url("${url}")`;
            // TODO: detect contain too
            styles.backgroundSize =
              fill.scaleMode === "FIT" ? "contain" : "cover"; // fill.
            styles.backgroundRepeat = "no-repeat";
            styles.backgroundPosition = "center";
          }
          // TODO:
          // const { color } = fill;
          // styles.backgroundColor = `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${fill.opacity})`
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

export function sortChildren(nodes: SceneNode[]) {
  const sortBy = <T>(arr: T[], fn: (item: T) => any) => {
    return arr.sort((a, b) => {
      const aVal = fn(a);
      const bVal = fn(b);
      return aVal > bVal ? 1 : bVal > aVal ? -1 : 0;
    });
  };

  // TODO: this is wrong for grids
  return sortBy(nodes, node => node.x + node.y);
}

export function processBackgroundLayer(node: SceneNode) {
  if (hasChildren(node)) {
    const lastChild = node.children[node.children.length - 1];
    if (
      lastChild.x === 0 &&
      lastChild.y === 0 &&
      lastChild.width === node.width &&
      lastChild.height === node.height
    ) {
      console.log("replacing a background");
      const last = (node.children as SceneNode[]).pop();
      Object.assign(node, last, {
        type: node.type
      });
    }
  }
}
export function processFillImages(node: SceneNode) {
  if (isGeometryNode(node)) {
    if (Array.isArray(node.fills)) {
      (node.fills as Paint[]).forEach(fill => {
        if (!fill.visible) {
          return;
        }
        if (fill.type === "IMAGE") {
          const intArr = (fill as any).intArr as Uint8Array | undefined;
          if (intArr) {
            // const buffer = intArr.buffer;
            // TODO: upload to Builder
            try {
              const url =
                "data:image/png;base64," + arrayBufferToBase64(intArr);
              (fill as any).url = url;
            } catch (err) {
              console.warn("Could not set background image", node, fill, err);
            }
          }
        }
      });
    }
  }
}

export function figmaToBuilder(
  figmaNode: SceneNode,
  parent?: SceneNode | null
): BuilderElement {
  // TODO: unsafe - be sure to clone this preserving Uint8Array
  const node = figmaNode;

  processBackgroundLayer(node);
  processFillImages(node);

  const layout = getAssumeLayoutTypeForNode(node);

  const children =
    hasChildren(node) && sortChildren(node.children as SceneNode[]);

  const image = getImage(node);

  return el({
    // id: "builder-" + node.id,
    responsiveStyles: {
      large: getCss(node, parent || null)
    },
    layerName: node.name,
    component: isTextNode(node)
      ? {
          name: "Text",
          options: {
            text: node.characters || ""
          }
        }
      : layout === "columns"
      ? {
          name: "Columns",
          // TODO: gutter var = average distance
          options: {
            // TODO: widths
            columns:
              children &&
              children.map((child: SceneNode) => ({
                blocks: [figmaToBuilder(child)]
              }))
          }
        }
      : image
      ? // TODO: delete background image if set
        {
          name: "Image",
          options: {
            image: (image as any).url,
            aspectRatio: node.height / node.width,
            backgroundPosition: "center",
            backgroundSize: image.scaleMode === "FIT" ? "contain" : "cover"
          }
        }
      : undefined,
    children:
      children && layout !== "columns"
        ? children.map((child: SceneNode) => figmaToBuilder(child, node))
        : undefined
  });
}

export function canConvertToBuilder(node: SceneNode) {
  const assumed = getAssumeLayoutTypeForNode(node);
  return Boolean(assumed && assumed !== "unknown");
}

export const collidesVertically = (a: SceneNode, b: SceneNode) =>
  a.y + a.height > b.y && a.y < b.y + b.height;

export const collidesHorizontally = (a: SceneNode, b: SceneNode) =>
  a.width + a.x > b.x && a.x < b.width + b.x;

export const collides = (a: SceneNode, b: SceneNode) =>
  collidesVertically(a, b) && collidesHorizontally(a, b);

// Margins
// Ordering
export function getAssumeLayoutTypeForNode(node: SceneNode): ComponentType {
  // TODO: check metadata, if not available fall back by position of inner elements
  const data = getMetadata(node);
  if (data && data.component) {
    return data.component;
  }

  if (hasChildren(node)) {
    let mostVerticalCollisions = 0;
    let mostHorizontalCollisions = 0;
    if (node.children.length === 1) {
      return "stack";
    }
    for (const child of node.children) {
      const siblings = node.children.filter(sibling => sibling !== child);
      const horizontalCollisions = siblings.filter(sibling =>
        collidesHorizontally(sibling, child)
      ).length;
      if (horizontalCollisions > mostHorizontalCollisions) {
        mostHorizontalCollisions = horizontalCollisions;
      }

      const verticalCollisions = siblings.filter(sibling =>
        collidesVertically(sibling, child)
      ).length;
      if (verticalCollisions > mostVerticalCollisions) {
        mostVerticalCollisions = verticalCollisions;
      }
    }

    if (mostHorizontalCollisions > 1 && mostHorizontalCollisions > 1) {
      return "grid"; // "wrap"?
    }

    if (mostVerticalCollisions > mostHorizontalCollisions) {
      return "stack";
    }

    const widths = node.children.map(item => item.width);
    // If each width is alost the same
    const minWidth = Math.min(...widths);
    const maxWidth = Math.max(...widths);
    if (maxWidth - minWidth < maxWidth / 10) {
      return "columns";
    }
    return "row";
  }

  return "unknown";
}
