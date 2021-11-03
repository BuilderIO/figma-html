export type WithRef<T> = Partial<T> & { ref?: Element | Node };
export type LayerNode = WithRef<RectangleNode | TextNode | FrameNode | SvgNode>;

export interface SvgNode extends DefaultShapeMixin, ConstraintMixin {
  type: "SVG";
  svg: string;
}
