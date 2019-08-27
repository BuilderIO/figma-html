// This plugin will open a modal to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser enviroment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, {
  width: 500,
  height: 300
});

async function processImages(layer: RectangleNode | TextNode) {
  const images = getImageFills(layer);
  return (
    images &&
    Promise.all(
      images.map(async image => {
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
    layer.fills.filter(item => item.type === "IMAGE");
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

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async msg => {
  function assign(a: any, b: any) {
    for (const key in b) {
      const value = b[key];
      if (value && ["width", "height", "type"].indexOf(key) === -1) {
        a[key] = b[key];
      }
    }
  }
  if (msg.type === "import") {
    const availableFonts = (await figma.listAvailableFontsAsync()).filter(
      font => font.fontName.style === "Regular"
    );
    await figma.loadFontAsync(defaultFont);
    const { data } = msg;
    const { layers } = data;
    const rects: SceneNode[] = [];
    let baseFrame: PageNode | FrameNode = figma.currentPage;
    for (const layer of layers) {
      try {
        if (layer.type === "FRAME") {
          const frame = figma.createFrame();
          frame.x = layer.x;
          frame.y = layer.y;
          frame.resize(layer.width, layer.height);
          rects.push(frame);
          baseFrame.appendChild(frame);
          baseFrame = frame;
        } else if (layer.type === "SVG") {
          const node = figma.createNodeFromSvg(layer.svg);
          node.x = layer.x;
          node.y = layer.y;
          node.resize(layer.width, layer.height);
          rects.push(node);
          baseFrame.appendChild(node);
        } else if (layer.type === "RECTANGLE") {
          const rect = figma.createRectangle();
          if (getImageFills(layer)) {
            await processImages(layer);
          }
          assign(rect, layer);
          rect.resize(layer.width, layer.height);
          rects.push(rect);
          baseFrame.appendChild(rect);
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
          text.resize(layer.width, layer.height);
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
          baseFrame.appendChild(text);
        }
      } catch (err) {
        console.warn("Error on layer:", layer, err);
      }
    }

    figma.viewport.scrollAndZoomIntoView([baseFrame]);
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  figma.closePlugin();
};
