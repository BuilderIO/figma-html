import { BuilderElement } from "@builder.io/sdk";
declare type ComponentType = "row" | "stack" | "columns" | "grid" | "canvas" | "unknown";
interface NodeMetaData {
    component?: ComponentType;
}
export declare const hasChildren: (node: unknown) => node is ChildrenMixin;
export declare const isTextNode: (node: unknown) => node is TextNode;
export declare const isRectangleNode: (node: unknown) => node is RectangleNode;
export declare const isFrameNode: (node: unknown) => node is FrameNode;
export declare const isGeometryNode: (node: unknown) => node is GeometryMixin;
export declare const isImage: (node: unknown) => node is GeometryMixin;
export declare const getImage: (node: unknown) => ImagePaint | null;
export declare const getMetadata: (node: SceneNode) => NodeMetaData | null;
export declare function traverseNode(node: SceneNode, cb: (node: SceneNode, parent: SceneNode | null) => void, _parent?: SceneNode | null): void;
export declare function getCss(node: SceneNode, parent: SceneNode | null): Partial<CSSStyleDeclaration>;
export declare function sortChildren(nodes: SceneNode[]): SceneNode[];
export declare function processBackgroundLayer(node: SceneNode): void;
export declare function processFillImages(node: SceneNode): void;
export declare function figmaToBuilder(figmaNode: SceneNode, parent?: SceneNode | null): BuilderElement;
export declare function canConvertToBuilder(node: SceneNode): boolean;
export declare const collidesVertically: (a: SceneNode, b: SceneNode, margin?: number) => boolean;
export declare const collidesHorizontally: (a: SceneNode, b: SceneNode) => boolean;
export declare function getAssumeLayoutTypeForNode(node: SceneNode): ComponentType;
export {};
