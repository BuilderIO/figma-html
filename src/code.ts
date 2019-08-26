// This plugin will open a modal to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser enviroment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

async function processImages(layer: RectangleNode | TextNode) {
  const image = getImageFill(layer);
  if (image && image.intArr) {
    image.imageHash = await figma.createImage(image.intArr).hash;
    delete image.intArr;
  }
}

function getImageFill(layer: RectangleNode | TextNode) {
  const image =
    Array.isArray(layer.fills) &&
    layer.fills.find(item => item.type === "IMAGE");
  return image;
}

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
    await figma.loadFontAsync({ family: "Roboto", style: "Regular" });
    const { data } = msg;
    const { layers } = data;
    const rects: SceneNode[] = [];
    for (const layer of layers) {
      try {
        if (layer.type === "SVG") {
          const node = figma.createNodeFromSvg(layer.svg);
          node.x = layer.x;
          node.y = layer.y;
          node.resize(layer.width, layer.height);
          rects.push(node);
          figma.currentPage.appendChild(node);
        } else if (layer.type === "RECTANGLE") {
          const rect = figma.createRectangle();
          if (getImageFill(layer)) {
            await processImages(layer);
          }
          assign(rect, layer);
          rect.resize(layer.width, layer.height);
          rects.push(rect);
          figma.currentPage.appendChild(rect);
        } else if (layer.type == "TEXT") {
          const text = figma.createText();
          assign(text, layer);
          text.resize(layer.width, layer.height);
          text.textAutoResize = "HEIGHT";
          let adjustments = 0;
          while (
            typeof text.fontSize === "number" &&
            text.height > layer.height * 1.5
          ) {
            if (adjustments++ > 50) {
              console.warn("Too many font adjustments", text, layer);
              continue;
            }
            text.fontSize -= 1;
          }
          rects.push(text);
          figma.currentPage.appendChild(text);
        }
      } catch (err) {
        console.warn("Error on layer:", layer, err);
      }
    }

    figma.viewport.scrollAndZoomIntoView(rects);
  }

  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  if (msg.type === "create-rectangles") {
    const nodes: SceneNode[] = [];
    for (let i = 0; i < msg.count; i++) {
      const rect = figma.createRectangle();
      rect.x = i * 150;
      rect.fills = [{ type: "SOLID", color: { r: 1, g: 0.5, b: 0 } }];
      figma.currentPage.appendChild(rect);
      nodes.push(rect);
    }
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  figma.closePlugin();
};
