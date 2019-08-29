import { BuilderElement } from "@builder.io/sdk";

const hasChildren = (node: unknown): node is ChildrenMixin =>
  !!(node && (node as any).children);

const getMetadata = (node: SceneNode) => {
  const anyNode = node as any;
  if (anyNode.data) {
    return anyNode.data;
  } else if (node.getSharedPluginData) {
    return node.getSharedPluginData("builder", "data");
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

export function figmaToBuilder(node: SceneNode) {}

// TODO
export function canConvertToBuilder(node: SceneNode) {}

export function getAssumeLayoutTypeForNode(node: SceneNode) {}
