export async function traverseLayers(
  layer: any,
  cb: (layer: any, parent: BaseNode | null) => void,
  parent: BaseNode | null = null
) {
  if (layer) {
    await cb(layer, parent);
  }
  if (layer.children) {
    for (const child of layer.children as any[]) {
      await traverseLayers(child, cb, layer);
    }
  }
}
