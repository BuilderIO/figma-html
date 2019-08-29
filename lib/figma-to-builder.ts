import { BuilderElement } from "@builder.io/sdk";

interface NodeMetaData {
  component?: "row" | "stack" | "columns" | "canvas" | "unknown";
}

const hasChildren = (node: unknown): node is ChildrenMixin =>
  !!(node && (node as any).children);

const isTextNode = (node: unknown): node is TextNode =>
  !!(node && (node as any).type === "TEXT");

const isRectangleNode = (node: unknown): node is RectangleNode =>
  !!(node && (node as any).type === "RECTANGLE");

const isFrameNode = (node: unknown): node is FrameNode =>
  !!(
    node &&
    ((node as any).type === "FRAME" || (node as any).type === "GROUP")
  );

const isGeometryNode = (node: unknown): node is GeometryMixin =>
  !!(node && (node as any).fills);

const getMetadata = (node: SceneNode): NodeMetaData | null => {
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

export function getCss(node: SceneNode) {
  const useAbsolute = ["canvas", "unknown"].includes(
    getAssumeLayoutTypeForNode(node)
  );

  const styles: Partial<CSSStyleDeclaration> = {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    ...(useAbsolute && {
      position: "absolute",
      top: node.y + "px",
      left: node.x + "px",
      width: node.width + "px",
      height: node.height + "px"
    })
  };

  if (isRectangleNode(node)) {
    if (typeof node.cornerRadius === "string") {
      styles.borderRadius = node.cornerRadius + "px";
    }
  }

  if (isTextNode(node)) {
  }

  return styles;
}

export function figmaToBuilder(node: SceneNode): BuilderElement {
  return el({
    id: "builder-" + node.id,
    responsiveStyles: {
      large: getCss(node)
    },
    layerName: node.name,
    component: isTextNode(node)
      ? {
          name: "Text",
          options: {
            text: node.characters
          }
        }
      : undefined,
    children: hasChildren(node)
      ? node.children.map(child => figmaToBuilder(child))
      : undefined
  });
}

export function canConvertToBuilder(node: SceneNode) {
  const assumed = getAssumeLayoutTypeForNode(node);
  return Boolean(assumed && assumed !== "unknown");
}

// TODO: full info like margins too...
export function getAssumeLayoutTypeForNode(node: SceneNode) {
  // TODO: check metadata, if not available fall back by position of inner elements
  const data = getMetadata(node);
  if (data && data.component) {
    return data.component;
  }
  return "unknown";
}
