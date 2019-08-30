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
  const parentLayout = parent && getAssumeLayoutTypeForNode(parent);
  const useAbsolute = false as boolean
    // parentLayout && ["canvas", "unknown"].includes(parentLayout);

  const numberValue = <T>(thing: T, property: keyof T) =>
    typeof thing[property] === "number" ? thing[property] + "px" : undefined;

  // TODO: top and left margin distances

  const styles: Partial<CSSStyleDeclaration> = {
    display: "flex",
    position: "relative",
    flexShrink: "0",
    boxSizing: "border-box",
    ...(layout === "stack" && {
      flexDirection: "column",
      alignItems: "stretch"
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

  if (parent && hasChildren(parent)) {
    // TODO grid
    const index = parent.children.indexOf(node);
    const priorSibling = index > 0 && parent.children[index - 1];
    if (parentLayout === "stack") {
      styles.marginLeft = node.x + "px";
      if (priorSibling) {
        styles.marginTop = `${node.y -
          (priorSibling.y + priorSibling.height)}px`;
      }
    }

    if (parentLayout === "row") {
      styles.marginTop = node.y + "px";
      if (priorSibling) {
        styles.marginLeft = `${node.x -
          (priorSibling.x + priorSibling.width)}px`;
      }
    }
  }

  if (hasChildren(node)) {
    if (layout === "stack") {
      const lastChild = last(node.children);
      if (lastChild) {
        styles.paddingBottom =
          Math.max(node.height - (lastChild.y + lastChild.height), 0) + "px";
      }
    }
    if (layout === "row") {
      const lastChild = last(node.children);
      if (lastChild) {
        styles.paddingRight =
          Math.max(node.width - (lastChild.x + lastChild.width), 0) + "px";
      }
    }
  }

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
          if (
            !isTextNode(node) &&
            getAssumeLayoutTypeForNode(node) !== "columns"
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
  return sortBy(nodes, node => node.x + node.y);
}

export function processBackgroundLayer(node: SceneNode) {
  if (hasChildren(node)) {
    const lastChild = node.children[0];
    if (
      lastChild.x === 0 &&
      lastChild.y === 0 &&
      lastChild.width === node.width &&
      lastChild.height === node.height
    ) {
      console.log("replacing a background");
      const last = (node.children as SceneNode[]).shift();
      Object.assign(node, last, {
        type: node.type,
        children: node.children.concat(hasChildren(last) ? last.children : [])
      });
    }
  }
}
export function processFillImages(node: SceneNode) {
  if (isGeometryNode(node)) {
    if (typeof node.fills !== "symbol") {
      node.fills.forEach(fill => {
        if (!fill.visible) {
          return;
        }
        if (fill.type === "IMAGE") {
          const intArr = (fill as any).intArr as Uint8Array | undefined;
          if (intArr) {
            try {
              const url =
                "data:image/png;base64," + arrayBufferToBase64(intArr);
              (fill as any).url = url;
            } catch (err) {
              console.warn("Could not set background image", node, fill, err);
            }
          } else {
            console.log("no intarr", fill, node);
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
  if (children) {
    (node as any).children = children;
  }

  const image = getImage(node);

  return el({
    // id: "builder-" + node.id,
    responsiveStyles: {
      large: getCss(node, parent || null)
    },
    // TODO: maybe put original layer ID in metadata
    layerName:
      node.name +
      (process.env.NODE_ENV === "development" ? " - " + node.id : ""),
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

export function getAssumeLayoutTypeForNode(node: SceneNode): ComponentType {
  const data = getMetadata(node);
  if (data && data.component) {
    return data.component;
  }

  if (hasChildren(node)) {
    let children = node.children;
    const firstChild = children[0];
    if (firstChild) {
      if (
        firstChild.x === 0 &&
        firstChild.y === 0 &&
        firstChild.width === node.width &&
        firstChild.height === node.height
      ) {
        children = children.slice(1);
      }
    }

    if (children.length < 2) {
      return "stack";
    }
    const minX = sortBy(children, child => child.x)[0];
    const maxX = last(sortBy(children, child => child.x + child.width));
    const xDelta = maxX.x + maxX.width - minX.x;

    const minY = sortBy(children, child => child.y)[0];
    const maxY = last(sortBy(children, child => child.y + child.width));
    const yDelta = maxY.y + maxY.width - minY.y;

    // TODO: if the overlaps are very similar, it is grid
    if (Math.abs(xDelta - yDelta) < (xDelta - yDelta) / 2) {
      return "grid";
    }

    if (yDelta > xDelta) {
      return "stack";
    }

    const widths = children.map(item => item.width);
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
