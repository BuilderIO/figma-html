export const hasChildren = (node: unknown): node is ChildrenMixin =>
  !!(node && (node as any).children);

export const isGroupNode = (node: unknown): node is GroupNode =>
  !!(node && (node as any).type === "GROUP");

export const getLayout = (node: SceneNode) => {
  // Simple single layer group wrapping we can ignore
  if (isGroupNode(node) && node.children?.length === 1) {
    return "column";
  }

  if ((node as FrameNode).layoutMode === "VERTICAL") {
    return "column";
  }
  if ((node as FrameNode).layoutMode === "HORIZONTAL") {
    return "row";
  }
  return "unknown";
};
