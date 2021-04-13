import { traverseLayers } from "./functions/traverse-layers";
import { settings } from "./constants/settings";
import { fastClone } from "./functions/fast-clone";
import { getLayout, hasChildren, isGroupNode } from "../lib/helpers";

const allPropertyNames = [
  "id",
  "width",
  "height",
  "currentPage",
  "cancel",
  "origin",
  "onmessage",
  "center",
  "zoom",
  "fontName",
  "name",
  "visible",
  "locked",
  "constraints",
  "relativeTransform",
  "x",
  "y",
  "rotation",
  "constrainProportions",
  "layoutAlign",
  "layoutGrow",
  "opacity",
  "blendMode",
  "isMask",
  "effects",
  "effectStyleId",
  "expanded",
  "backgrounds",
  "backgroundStyleId",
  "fills",
  "strokes",
  "strokeWeight",
  "strokeMiterLimit",
  "strokeAlign",
  "strokeCap",
  "strokeJoin",
  "dashPattern",
  "fillStyleId",
  "strokeStyleId",
  "cornerRadius",
  "cornerSmoothing",
  "topLeftRadius",
  "topRightRadius",
  "bottomLeftRadius",
  "bottomRightRadius",
  "exportSettings",
  "overflowDirection",
  "numberOfFixedChildren",
  "description",
  "layoutMode",
  "primaryAxisSizingMode",
  "counterAxisSizingMode",
  "primaryAxisAlignItems",
  "counterAxisAlignItems",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingBottom",
  "itemSpacing",
  "layoutGrids",
  "gridStyleId",
  "clipsContent",
  "guides",
  "guides",
  "selection",
  "selectedTextRange",
  "backgrounds",
  "arcData",
  "pointCount",
  "pointCount",
  "innerRadius",
  "vectorNetwork",
  "vectorPaths",
  "handleMirroring",
  "textAlignHorizontal",
  "textAlignVertical",
  "textAutoResize",
  "paragraphIndent",
  "paragraphSpacing",
  "autoRename",
  "textStyleId",
  "fontSize",
  "fontName",
  "textCase",
  "textDecoration",
  "letterSpacing",
  "lineHeight",
  "characters",
  "mainComponent",
  "scaleFactor",
  "booleanOperation",
  "expanded",
  "name",
  "type",
  "paints",
  "type",
  "fontSize",
  "textDecoration",
  "fontName",
  "letterSpacing",
  "lineHeight",
  "paragraphIndent",
  "paragraphSpacing",
  "textCase",
  "type",
  "effects",
  "type",
  "layoutGrids",
];

// The Figma nodes are hard to inspect at a glance because almost all properties are non enumerable
// getters. This removes that wrapping for easier inspecting
const cloneObject = (obj: any, valuesSet = new Set()) => {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const newObj: any = Array.isArray(obj) ? [] : {};

  for (const property of allPropertyNames) {
    const value = obj[property];
    if (value !== undefined && typeof value !== "symbol") {
      newObj[property] = obj[property];
    }
  }

  return newObj;
};

async function postSelection() {
  console.log(
    JSON.stringify(
      figma.currentPage.selection.map((obj) => cloneObject(obj)),
      null,
      2
    )
  );
  figma.ui.postMessage({
    type: "selectionChange",
    elements: fastClone(
      await Promise.all(
        figma.currentPage.selection.map((el) =>
          serialize(el as any, {
            // TODO: only need one level deep......
            withChildren: true,
          })
        )
      )
    ),
  });
}

figma.on("selectionchange", async () => {
  postSelection();
});

// This shows the HTML page in "ui.html".
figma.showUI(__html__, {
  width: settings.ui.baseWidth,
  height: settings.ui.baseHeight,
});
async function processImages(layer: RectangleNode | TextNode) {
  const images = getImageFills(layer);
  return (
    images &&
    Promise.all(
      images.map(async (image: any) => {
        if (image && image.intArr) {
          image.imageHash = await figma.createImage(image.intArr).hash;
          delete image.intArr;
        }
      })
    )
  );
}

function getImageFills(layer: RectangleNode | TextNode) {
  const images =
    Array.isArray(layer.fills) &&
    layer.fills.filter((item) => item.type === "IMAGE");
  return images;
}

const normalizeName = (str: string) =>
  str.toLowerCase().replace(/[^a-z]/gi, "");

const defaultFont = { family: "Roboto", style: "Regular" };

// TODO: keep list of fonts not found
async function getMatchingFont(fontStr: string, availableFonts: Font[]) {
  const familySplit = fontStr.split(/\s*,\s*/);

  for (const family of familySplit) {
    const normalized = normalizeName(family);
    for (const availableFont of availableFonts) {
      const normalizedAvailable = normalizeName(availableFont.fontName.family);
      if (normalizedAvailable === normalized) {
        const cached = fontCache[normalizedAvailable];
        if (cached) {
          return cached;
        }
        await figma.loadFontAsync(availableFont.fontName);
        fontCache[fontStr] = availableFont.fontName;
        fontCache[normalizedAvailable] = availableFont.fontName;
        return availableFont.fontName;
      }
    }
  }

  return defaultFont;
}

const fontCache: { [key: string]: FontName | undefined } = {};

async function serialize(
  element: any,
  options: {
    withImages?: boolean;
    withChildren?: boolean;
    // TODO
    withVectorsExported?: boolean;
  } = {}
): Promise<any> {
  let fills = (element.fills && (fastClone(element.fills) as Paint[])) || [];
  if (options.withImages && fills.length) {
    for (const fill of fills) {
      if (fill.type === "IMAGE" && fill.imageHash) {
        const image = figma.getImageByHash(fill.imageHash);
        try {
          const bytes = await image.getBytesAsync();
          (fill as any).intArr = bytes;
        } catch (err) {
          console.warn("Could not get image for layer", element, fill, err);
        }
      }
    }
  }

  // TODO: May have bg...
  const isSvg =
    (hasChildren(element) &&
      element.children.every((item) => item.type === "VECTOR")) ||
    element.type === "VECTOR";

  if (
    options.withImages &&
    // options.withVectorsExported !== false &&
    isSvg
  ) {
    const image = await element.exportAsync({
      // TODO: use SVG for SVGs
      format: "PNG",
      constraint: {
        type: "SCALE",
        value: 2,
      },
    });
    fills = [
      {
        type: "IMAGE",
        visible: true,
        scaleMode: "FIT",
        ...({ intArr: image } as any),
      },
    ];
  }

  // TODO: better way to enumerate everything, including getters, that is not function
  return {
    ...cloneObject(element),
    fills,
    type: element.type === "VECTOR" ? "RECTANGLE" : element.type,
    data: JSON.parse(element.getSharedPluginData("builder", "data") || "{}"),
    children:
      (options.withChildren &&
        element.children &&
        !isSvg &&
        (await Promise.all(
          element.children
            .filter((child: SceneNode) => child.visible)
            .map((child: any) => serialize(child as any, options))
        ))) ||
      undefined,
  };
}

type AnyStringMap = { [key: string]: any };

function assign(a: BaseNode & AnyStringMap, b: AnyStringMap) {
  for (const key in b) {
    const value = b[key];
    if (key === "data" && value && typeof value === "object") {
      const currentData =
        JSON.parse(a.getSharedPluginData("builder", "data") || "{}") || {};
      const newData = value;
      const mergedData = Object.assign({}, currentData, newData);
      // TODO merge plugin data
      a.setSharedPluginData("builder", "data", JSON.stringify(mergedData));
    } else if (
      typeof value != "undefined" &&
      ["width", "height", "type", "ref", "children", "svg"].indexOf(key) === -1
    ) {
      try {
        a[key] = b[key];
      } catch (err) {
        console.warn(`Assign error for property "${key}"`, a, b, err);
      }
    }
  }
}

const isImportErrorsKey = "isImportErrors";

function clearAllErrors() {
  figma.currentPage.children.forEach((el) => {
    if (el.getPluginData(isImportErrorsKey) === "true") {
      el.remove();
    }
  });
}

const importableLayerTypes = new Set<NodeType>([
  "RECTANGLE",
  "FRAME",
  "TEXT",
  "COMPONENT",
  "LINE",
]);

const isNotImportable = (node: SceneNode) =>
  // Don't show warnings for invisble nodes, we don't import them
  !node.visible
    ? false
    : ((node as FrameNode | GroupNode).children &&
        getLayout(node) === "unknown") ||
      !importableLayerTypes.has(node.type);

const getAbsolutePositionRelativeToArtboard = (node: SceneNode) => {
  if (
    typeof node.x !== "number" ||
    !node.parent ||
    ["PAGE", "DOCUMENT"].includes(node.type)
  ) {
    return { x: 0, y: 0 };
  }
  const position = {
    x: node.x,
    y: node.y,
  };

  if (["PAGE", "DOCUMENT"].includes(node.parent.type)) {
    return position;
  }

  let parent: SceneNode | null = node;
  while ((parent = parent.parent as SceneNode | null)) {
    if (!isGroupNode(parent) && typeof parent.x === "number") {
      position.x += parent.x;
      position.y += parent.y;
    }
    // This is the end
    if (["PAGE", "DOCUMENT"].includes(parent.parent!?.type)) {
      break;
    }
  }

  return position;
};

const getAbsolutePositionRelativeToRootLayer = (
  node: SceneNode,
  rootPosition: { x: number; y: number }
) => {
  const nodeAbsolutePosition = getAbsolutePositionRelativeToArtboard(node);
  return {
    x: nodeAbsolutePosition.x - rootPosition.x,
    y: nodeAbsolutePosition.y - rootPosition.y,
  };
};

const hasInvisibleParent = (node: SceneNode): boolean => {
  let parent: SceneNode | null = node;
  do {
    if (!parent.visible) {
      return true;
    }
  } while ((parent = parent.parent as SceneNode | null));

  return false;
};

// Returns true if valid
async function checkIfCanGetCode() {
  clearAllErrors();
  const selected = figma.currentPage.selection[0];
  if (!selected) {
    return false;
  }

  const invalidLayers: SceneNode[] = [];

  await traverseLayers(selected, (node: SceneNode) => {
    if (!hasInvisibleParent(node) && isNotImportable(node)) {
      invalidLayers.push(node);
    }
  });

  if (invalidLayers.length) {
    const errorFrame = figma.createFrame();
    errorFrame.name = "Export to code errors - delete me anytime";
    const absolutePosition = getAbsolutePositionRelativeToArtboard(selected);
    errorFrame.x = absolutePosition.x;
    errorFrame.y = absolutePosition.y;
    errorFrame.fills = [];
    errorFrame.resize(selected.width || 1, selected.height || 1);
    errorFrame.setPluginData(isImportErrorsKey, "true");

    for (const invalidLayer of invalidLayers) {
      const errorLayer = figma.createRectangle();
      errorLayer.setPluginData(isImportErrorsKey, "true");
      errorLayer.name = `"${invalidLayer.name}" needs to use autolayout or be a rasterized image`;
      const { x, y } = getAbsolutePositionRelativeToRootLayer(
        invalidLayer,
        absolutePosition
      );
      errorLayer.x = x;
      errorLayer.y = y;
      errorLayer.fills = [];
      errorLayer.resize(invalidLayer.width || 1, invalidLayer.height || 1);

      errorLayer.strokeWeight = 4;
      errorLayer.strokes = [
        {
          type: "SOLID",
          visible: true,
          opacity: 1,
          blendMode: "NORMAL",
          color: {
            r: 1,
            g: 0,
            b: 0,
          },
        },
      ];
      errorFrame.appendChild(errorLayer);
    }
  }

  return !invalidLayers.length;
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async (msg) => {
  if (msg.type === "resize") {
    figma.ui.resize(msg.width, msg.height);
  }

  if (msg.type === "getStorage") {
    const data = await figma.clientStorage.getAsync("data");
    figma.ui.postMessage({
      type: "storage",
      data,
    });
  }
  if (msg.type === "init") {
    postSelection();
  }
  if (msg.type === "setStorage") {
    const data = msg.data;
    figma.clientStorage.setAsync("data", data);
  }

  if (msg.type === "checkIfCanGetCode") {
    const canGet = await checkIfCanGetCode();
    figma.ui.postMessage({
      type: "canGetCode",
      value: canGet,
    });
  }

  if (msg.type === "getSelectionWithImages") {
    figma.ui.postMessage({
      type: "selectionWithImages",
      elements: await Promise.all(
        figma.currentPage.selection.map((el) =>
          serialize(el as any, {
            withChildren: true,
            withImages: true,
          })
        )
      ),
    });
  }

  if (msg.type === "updateElements") {
    const elements = msg.elements;
    for (const element of elements) {
      const el = figma.getNodeById(element.id);
      if (el) {
        assign(el as any, element);
      }
    }
  }
  if (msg.type === "clearErrors") {
    clearAllErrors();
  }

  if (msg.type === "import") {
    const availableFonts = (await figma.listAvailableFontsAsync()).filter(
      (font) => font.fontName.style === "Regular"
    );
    await figma.loadFontAsync(defaultFont);
    const { data } = msg;
    const { layers } = data;
    const rects: SceneNode[] = [];
    let baseFrame: PageNode | FrameNode = figma.currentPage;
    // TS bug? TS is implying that frameRoot is PageNode and ignoring the type declaration
    // and the reassignment unless I force it to treat baseFrame as any
    let frameRoot: PageNode | FrameNode = baseFrame as any;
    for (const rootLayer of layers) {
      await traverseLayers(rootLayer, async (layer: any, parent) => {
        try {
          if (layer.type === "FRAME" || layer.type === "GROUP") {
            const frame = figma.createFrame();
            frame.x = layer.x;
            frame.y = layer.y;
            frame.resize(layer.width || 1, layer.height || 1);
            assign(frame, layer);
            rects.push(frame);
            ((parent && (parent as any).ref) || baseFrame).appendChild(frame);
            layer.ref = frame;
            if (!parent) {
              frameRoot = frame;
              baseFrame = frame;
            }
            // baseFrame = frame;
          } else if (layer.type === "SVG") {
            const node = figma.createNodeFromSvg(layer.svg);
            node.x = layer.x;
            node.y = layer.y;
            node.resize(layer.width || 1, layer.height || 1);
            layer.ref = node;
            rects.push(node);
            assign(node, layer);
            ((parent && (parent as any).ref) || baseFrame).appendChild(node);
          } else if (layer.type === "RECTANGLE") {
            const rect = figma.createRectangle();
            if (getImageFills(layer)) {
              await processImages(layer);
            }
            assign(rect, layer);
            rect.resize(layer.width || 1, layer.height || 1);
            rects.push(rect);
            layer.ref = rect;
            ((parent && (parent as any).ref) || baseFrame).appendChild(rect);
          } else if (layer.type == "TEXT") {
            const text = figma.createText();
            if (layer.fontFamily) {
              const cached = fontCache[layer.fontFamily];
              if (cached) {
                text.fontName = cached;
              } else {
                const family = await getMatchingFont(
                  layer.fontFamily || "",
                  availableFonts
                );
                text.fontName = family;
              }
              delete layer.fontFamily;
            }
            assign(text, layer);
            layer.ref = text;
            text.resize(layer.width || 1, layer.height || 1);
            text.textAutoResize = "HEIGHT";
            const lineHeight =
              (layer.lineHeight && layer.lineHeight.value) || layer.height;
            let adjustments = 0;
            while (
              typeof text.fontSize === "number" &&
              typeof layer.fontSize === "number" &&
              (text.height > Math.max(layer.height, lineHeight) * 1.2 ||
                text.width > layer.width * 1.2)
            ) {
              // Don't allow changing more than ~30%
              if (adjustments++ > layer.fontSize * 0.3) {
                console.warn("Too many font adjustments", text, layer);
                // debugger
                break;
              }
              try {
                text.fontSize = text.fontSize - 1;
              } catch (err) {
                console.warn("Error on resize text:", layer, text, err);
              }
            }
            rects.push(text);
            ((parent && (parent as any).ref) || baseFrame).appendChild(text);
          }
        } catch (err) {
          console.warn("Error on layer:", layer, err);
        }
      });
    }
    if (frameRoot.type === "FRAME") {
      figma.currentPage.selection = [frameRoot];
    }

    figma.ui.postMessage({
      type: "doneLoading",
      rootId: frameRoot.id,
    });

    figma.viewport.scrollAndZoomIntoView([frameRoot]);

    if (process.env.NODE_ENV !== "development") {
      figma.closePlugin();
    }
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
};
