import { BuilderElement } from "@builder.io/sdk";

interface NodeMetaData {
  component?: "row" | "stack" | "columns" | "canvas" | "unknown";
}

function base64ArrayBuffer(bytes: Uint8Array) {
  var base64 = "";
  var encodings =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  var byteLength = bytes.byteLength;
  var byteRemainder = byteLength % 3;
  var mainLength = byteLength - byteRemainder;

  var a, b, c, d;
  var chunk;

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63; // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4; // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + "==";
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2; // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + "=";
  }

  return base64;
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

export function getCss(node: SceneNode) {
  const useAbsolute = ["canvas", "unknown"].includes(
    getAssumeLayoutTypeForNode(node)
  );

  const numberValue = <T>(thing: T, property: keyof T) =>
    typeof thing[property] === "number" ? thing[property] + "px" : undefined;

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
          const intArr = (fill as any).intArr as Uint8Array | undefined;
          if (intArr) {
            // const buffer = intArr.buffer;
            // TODO: upload to Builder
            try {
              const url = "data:image/png;base64," + base64ArrayBuffer(intArr);
              styles.backgroundImage = `url("${url}")`;
              // TODO: detect contain too
              styles.backgroundSize =
                fill.scaleMode === "FIT" ? "contain" : "cover"; // fill.
              styles.backgroundRepeat = "no-repeat";
              styles.backgroundPosition = "center";
            } catch (err) {
              console.warn("Could not set background image", node, fill, err);
            }
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

export function figmaToBuilder(node: SceneNode): BuilderElement {
  return el({
    // id: "builder-" + node.id,
    responsiveStyles: {
      large: getCss(node)
    },
    layerName: node.name,
    component: isTextNode(node)
      ? {
          name: "Text",
          options: {
            text: node.characters || ""
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
