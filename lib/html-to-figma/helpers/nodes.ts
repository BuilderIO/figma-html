import { LayerNode } from "../types/nodes";

export const hasChildren = (node: LayerNode): node is ChildrenMixin =>
  node && Array.isArray((node as ChildrenMixin).children);

export function traverse(
  layer: LayerNode,
  cb: (layer: LayerNode, parent?: LayerNode | null) => void,
  parent?: LayerNode | null
) {
  if (layer) {
    cb(layer, parent);
    if (hasChildren(layer)) {
      layer.children.forEach((child) =>
        traverse(child as LayerNode, cb, layer)
      );
    }
  }
}

export function textNodesUnder(el: Element) {
  let n: Node | null = null;
  const a: Node[] = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);

  while ((n = walk.nextNode())) {
    a.push(n);
  }
  return a;
}

export function isHidden(element: Element) {
  let el: Element | null = element;
  do {
    const computed = getComputedStyle(el);
    if (
      // computed.opacity === '0' ||
      computed.display === "none" ||
      computed.visibility === "hidden"
    ) {
      return true;
    }
    // Some sites hide things by having overflow: hidden and height: 0, e.g. dropdown menus that animate height in
    if (
      computed.overflow !== "visible" &&
      el.getBoundingClientRect().height < 1
    ) {
      return true;
    }
  } while ((el = el.parentElement));
  return false;
}

export function getParents(node: Element | Node): Element[] {
  let el: Element | null =
    node instanceof Node && node.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : (node as Element);

  const parents: Element[] = [];
  while (el && (el = el.parentElement)) {
    parents.push(el);
  }
  return parents;
}

export function getDepth(node: Element | Node) {
  return getParents(node).length;
}
