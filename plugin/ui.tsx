import { BuilderElement } from "@builder.io/sdk";
import {
  Button,
  CircularProgress,
  createMuiTheme,
  CssBaseline,
  Divider,
  FormControlLabel,
  IconButton,
  MuiThemeProvider,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Select,
  MenuItem,
  withStyles,
} from "@material-ui/core";
import green from "@material-ui/core/colors/green";
import { HelpOutline } from "@material-ui/icons";
import Favorite from "@material-ui/icons/Favorite";
import LaptopMac from "@material-ui/icons/LaptopMac";
import PhoneIphone from "@material-ui/icons/PhoneIphone";
import TabletMac from "@material-ui/icons/TabletMac";
import * as fileType from "file-type";
import { action, computed, observable, when } from "mobx";
import { observer } from "mobx-react";
import * as pako from "pako";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as md5 from "spark-md5";
import * as traverse from "traverse";
import { arrayBufferToBase64 } from "../lib/functions/buffer-to-base64";
import { SafeComponent } from "./classes/safe-component";
import { settings } from "./constants/settings";
import { theme as themeVars } from "./constants/theme";
import { fastClone } from "./functions/fast-clone";
import { traverseLayers } from "./functions/traverse-layers";
import "./ui.css";
import { IntlProvider, FormattedMessage } from "react-intl";
import { en, ru } from "./localize/i18n";

// Simple debug flag - flip when needed locally
const useDev = false;

const apiHost = useDev ? "http://localhost:5000" : "https://builder.io";

const selectionToBuilder = async (
  selection: SceneNode[]
): Promise<BuilderElement[]> => {
  const useGzip = true;

  selection = fastClone(selection);

  traverse(selection).forEach(function (item) {
    if (this.key === "intArr") {
      this.delete();
    }
  });

  const res = await fetch(`${apiHost}/api/v1/figma-to-builder`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(
      useGzip
        ? {
            compressedNodes: pako.deflate(JSON.stringify(selection), {
              to: "string",
            }),
          }
        : {
            nodes: selection,
          }
    ),
  }).then((res) => {
    if (!res.ok) {
      console.error("Figma-to-builder request failed", res);
      throw new Error("Figma-to-builder request failed");
    }
    return res.json();
  });
  return res.blocks;
};

interface ClientStorage {
  imageUrlsByHash: { [hash: string]: string | null } | undefined;
}

const apiKey = process.env.API_KEY || null;
const apiRoot =
  process.env.API_ROOT && process.env.NODE_ENV !== "production"
    ? process.env.API_ROOT
    : "https://builder.io";

const WIDTH_LS_KEY = "builder.widthSetting";
const FRAMES_LS_KEY = "builder.useFramesSetting";

// TODO: make async and use figma.clientStorage
function lsGet(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key)!);
  } catch (err) {
    return undefined;
  }
}
function lsSet(key: string, value: any) {
  try {
    return localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    return undefined;
  }
}

const clamp = (num: number, min: number, max: number) =>
  Math.max(min, Math.min(max, num));

type Node = TextNode | RectangleNode;

const theme = createMuiTheme({
  typography: themeVars.typography,
  palette: {
    primary: { main: themeVars.colors.primary },
    secondary: green,
  },
});

const StyledButton = withStyles({
  root: {
    fontSize: "12px",
    padding: "8px",
    height: "30px",
    minHeight: "unset",
    display: "flex",
    justifyContent: "center",
  },
})(MenuItem);

const BASE64_MARKER = ";base64,";
function convertDataURIToBinary(dataURI: string) {
  const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
  const base64 = dataURI.substring(base64Index);
  const raw = window.atob(base64);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}

function getImageFills(layer: Node) {
  const images =
    Array.isArray(layer.fills) &&
    layer.fills.filter((item) => item.type === "IMAGE");
  return images;
}

// TODO: CACHE!
// const imageCache: { [key: string]: Uint8Array | undefined } = {};
async function processImages(layer: Node) {
  const images = getImageFills(layer);

  const convertToSvg = (value: string) => {
    (layer as any).type = "SVG";
    (layer as any).svg = value;
    if (typeof layer.fills !== "symbol") {
      layer.fills = layer.fills.filter((item) => item.type !== "IMAGE");
    }
  };
  return images
    ? Promise.all(
        images.map(async (image: any) => {
          try {
            if (image) {
              const url = image.url;
              if (url.startsWith("data:")) {
                const type = url.split(/[:,;]/)[1];
                if (type.includes("svg")) {
                  const svgValue = decodeURIComponent(url.split(",")[1]);
                  convertToSvg(svgValue);
                  return Promise.resolve();
                } else {
                  if (url.includes(BASE64_MARKER)) {
                    image.intArr = convertDataURIToBinary(url);
                    delete image.url;
                  } else {
                    console.info(
                      "Found data url that could not be converted",
                      url
                    );
                  }
                  return;
                }
              }

              const isSvg = url.endsWith(".svg");

              // Proxy returned content through Builder so we can access cross origin for
              // pulling in photos, etc
              const res = await fetch(
                "https://builder.io/api/v1/proxy-api?url=" +
                  encodeURIComponent(url)
              );

              const contentType = res.headers.get("content-type");
              if (isSvg || (contentType && contentType.includes("svg"))) {
                const text = await res.text();
                convertToSvg(text);
              } else {
                const arrayBuffer = await res.arrayBuffer();
                const type = fileType(arrayBuffer);
                if (
                  type &&
                  (type.ext.includes("svg") || type.mime.includes("svg"))
                ) {
                  convertToSvg(await res.text());
                  return;
                } else {
                  const intArr = new Uint8Array(arrayBuffer);
                  delete image.url;
                  image.intArr = intArr;
                }
              }
            }
          } catch (err) {
            console.warn("Could not fetch image", layer, err);
          }
        })
      )
    : Promise.resolve([]);
}

export type Component = "row" | "stack" | "absolute";

export type SizeType = "shrink" | "expand" | "fixed";

export const sizeTypes: SizeType[] = ["expand", "shrink", "fixed"];

const invalidOptionString = "...";
type InvalidComponentOption = typeof invalidOptionString;

@observer
class App extends SafeComponent {
  editorRef: HTMLIFrameElement | null = null;

  @observable loading = false;
  // TODO: lsget/set?
  @observable lipsum = false; //  process.env.NODE_ENV !== "production";
  @observable loadingGenerate = false;
  @observable apiRoot = apiRoot;
  @observable clientStorage: ClientStorage | null = null;
  @observable errorMessage = "";

  @observable generatingCode = false;
  @observable urlValue = "https://www.builder.io";
  @observable width = lsGet(WIDTH_LS_KEY) || "1200";
  @observable online = navigator.onLine;
  @observable useFrames = lsGet(FRAMES_LS_KEY) || false;
  @observable showMoreOptions = true; // lsGet(MORE_OPTIONS_LS_KEY) || false;
  @observable selection: (BaseNode & { data?: { [key: string]: any } })[] = [];
  @observable.ref selectionWithImages:
    | (BaseNode & {
        data?: { [key: string]: any };
      })[]
    | null = null;

  @observable commandKeyDown = false;
  @observable shiftKeyDown = false;
  @observable altKeyDown = false;
  @observable ctrlKeyDown = false;
  @observable showRequestFailedError = false;
  @observable showImportInvalidError = false;
  @observable isValidImport: null | boolean = null;
  @observable.ref previewData: any;
  @observable displayFiddleUrl = "";
  @observable currentLanguage = "en";

  editorScriptAdded = false;
  dataToPost: any;

  async getImageUrl(
    intArr: Uint8Array,
    imageHash?: string
  ): Promise<string | null> {
    let hash = imageHash;
    if (!hash) {
      hash = md5.ArrayBuffer.hash(intArr);
    }
    const fromCache =
      hash &&
      this.clientStorage &&
      this.clientStorage.imageUrlsByHash &&
      this.clientStorage.imageUrlsByHash[hash];

    if (fromCache) {
      console.debug("Used URL from cache", fromCache);
      return fromCache;
    }
    if (!apiKey) {
      console.warn("Tried to upload image without API key");
      return null;
    }

    return fetch(`${apiRoot}/api/v1/upload?apiKey=${apiKey}`, {
      method: "POST",
      body: JSON.stringify({
        image: arrayBufferToBase64(intArr),
      }),
      headers: {
        "content-type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const { url } = data;
        if (typeof url !== "string") {
          return null;
        }
        if (this.clientStorage && hash) {
          if (!this.clientStorage.imageUrlsByHash) {
            this.clientStorage.imageUrlsByHash = {};
          }
          this.clientStorage.imageUrlsByHash[hash] = url;
        }

        return url;
      });
  }

  getDataForSelection(name: string, multipleValuesResponse = null) {
    if (!this.selection.length) {
      return multipleValuesResponse;
    }
    const firstNode = this.selection[0];
    let value = firstNode.data && firstNode.data[name];
    for (const item of this.selection.slice(1)) {
      const itemValue = item.data && item.data[name];
      if (itemValue !== value) {
        return multipleValuesResponse;
      }
    }
    return value;
  }

  async updateStorage() {
    await when(() => !!this.clientStorage);
    parent.postMessage(
      {
        pluginMessage: {
          type: "setStorage",
          data: fastClone(this.clientStorage),
        },
      },
      "*"
    );
  }

  setDataForSelection(name: string, value: any) {
    for (const node of this.selection) {
      if (!node.data) {
        node.data = {
          [name]: value,
        };
      } else {
        node.data[name] = value;
      }
    }
    // TODO: throttleNextTick
    this.saveUpdates();
  }

  form: HTMLFormElement | null = null;
  urlInputRef: HTMLInputElement | null = null;
  iframeRef: HTMLIFrameElement | null = null;

  @computed get urlValid() {
    function validURL(str: string) {
      var pattern = new RegExp(
        "^(https?:\\/\\/)?" + // protocol
          "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
          "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
          "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
          "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
          "(\\#[-a-z\\d_]*)?$",
        "i"
      ); // fragment locator
      return !!pattern.test(str);
    }

    return validURL(this.urlValue);
  }

  @action
  updateKeyPositions(event: KeyboardEvent) {
    this.commandKeyDown = event.metaKey;
    this.altKeyDown = event.altKey;
    this.shiftKeyDown = event.shiftKey;
    this.ctrlKeyDown = event.ctrlKey;
  }

  @action
  async getCode(useFiddle = false) {
    this.displayFiddleUrl = "";
    this.showImportInvalidError = false;
    this.showRequestFailedError = false;
    if (!this.lipsum) {
      this.selectionWithImages = null;
      parent.postMessage(
        {
          pluginMessage: {
            type: "getSelectionWithImages",
          },
        },
        "*"
      );

      this.generatingCode = true;

      await when(() => !!this.selectionWithImages);
    } else {
      this.selectionWithImages = this.selection;
    }

    if (!(this.selectionWithImages && this.selectionWithImages[0])) {
      console.warn("No selection with images");
      return;
    }

    // TODO: analyze if page is properly nested and annotated, if not
    // suggest in the UI what needs grouping
    const selectionToBuilderPromise = selectionToBuilder(
      this.selectionWithImages as any
    ).catch((err) => {
      this.loadingGenerate = false;
      this.generatingCode = false;
      this.showRequestFailedError = true;
      throw err;
    });

    const imagesPromises: Promise<any>[] = [];
    const imageMap: { [key: string]: string } = {};
    for (const layer of this.selectionWithImages as SceneNode[]) {
      traverseLayers(layer, (node) => {
        const imageFills = getImageFills(node as Node);
        const image = imageFills && imageFills[0];
        if ((image as any)?.intArr) {
          imagesPromises.push(
            (async () => {
              const { id } = await fetch(`${apiHost}/api/v1/stage-image`, {
                method: "POST",
                body: JSON.stringify({
                  image: arrayBufferToBase64((image as any).intArr),
                }),
                headers: {
                  "content-type": "application/json",
                },
              }).then((res) => {
                if (!res.ok) {
                  console.error("Image upload failed", res);
                  throw new Error("Image upload failed");
                }
                return res.json();
              });
              delete (node as any).intArr;
              imageMap[node.id] = id;
            })()
          );
        }
      });
    }

    const blocks = await selectionToBuilderPromise;
    await Promise.all(imagesPromises).catch((err) => {
      this.loadingGenerate = false;
      this.generatingCode = false;
      this.showRequestFailedError = true;
      throw err;
    });

    traverse(blocks).forEach((item) => {
      if (item?.["@type"] === "@builder.io/sdk:Element") {
        const image = imageMap[item.meta?.figmaLayerId];
        if (image) {
          const url = `https://cdn.builder.io/api/v1/image/assets%2FTEMP%2F${image}`;
          if (item.component?.options) {
            item.component.options.image = url;
          } else if (item.responsiveStyles?.large?.backgroundImage) {
            item.responsiveStyles.large.backgroundImage = `url("${url}")`;
          }
        }
      }
    });

    const data = {
      data: {
        blocks: blocks,
      },
    };

    this.isValidImport = null;
    parent.postMessage(
      {
        pluginMessage: {
          type: "checkIfCanGetCode",
        },
      },
      "*"
    );

    this.generatingCode = true;

    await when(() => typeof this.isValidImport === "boolean");
    if (!this.isValidImport) {
      this.generatingCode = false;
      this.isValidImport = null;
      this.showImportInvalidError = true;
      return;
    }
    this.isValidImport = null;

    const json = JSON.stringify(data);

    if (useFiddle) {
      const res = await fetch(apiHost + "/api/v1/fiddle", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: json,
      })
        .then((res) => {
          if (!res.ok) {
            console.error("Failed to create fiddle", res);
            throw new Error("Failed to create fiddle");
          }
          return res.json();
        })
        .catch((err) => {
          this.generatingCode = false;
          this.selectionWithImages = null;
          this.showRequestFailedError = true;

          throw err;
        });
      if (res.url) {
        open(res.url, "_blank");
        this.displayFiddleUrl = res.url;
      }
      this.generatingCode = false;
      this.selectionWithImages = null;
    } else {
      const blob = new Blob([json], {
        type: "application/json",
      });

      const link = document.createElement("a");
      link.setAttribute("href", URL.createObjectURL(blob));
      link.setAttribute("download", "page.builder.json");
      document.body.appendChild(link); // Required for FF

      link.click();
      document.body.removeChild(link);

      this.generatingCode = false;
      this.selectionWithImages = null;
    }
  }

  @observable initialized = false;

  componentDidMount() {
    window.addEventListener("message", (e) => {
      const { data: rawData, source } = e as MessageEvent;

      this.initialized = true;

      const data = rawData.pluginMessage;
      if (!data) {
        return;
      }
      if (data.type === "selectionChange") {
        this.selection = data.elements;
      }
      if (data.type === "selectionWithImages") {
        this.selectionWithImages = data.elements;
      }
      if (data.type === "canGetCode") {
        this.isValidImport = data.value;
      }
      if (data.type === "doneLoading") {
        this.loading = false;
      }
      if (data.type === "storage") {
        this.clientStorage = data.data || {};
      }
    });

    parent.postMessage(
      {
        pluginMessage: {
          type: "getStorage",
        },
      },
      "*"
    );
    parent.postMessage(
      {
        pluginMessage: {
          type: "init",
        },
      },
      "*"
    );

    // TODO: destroy on component unmount
    this.safeReaction(
      () => this.urlValue,
      () => (this.errorMessage = "")
    );
    this.selectAllUrlInputText();

    this.safeListenToEvent(window, "offline", () => (this.online = false));
    this.safeListenToEvent(window, "keydown", (e) => {
      this.updateKeyPositions(e as KeyboardEvent);
    });
    this.safeListenToEvent(window, "keyup", (e) => {
      this.updateKeyPositions(e as KeyboardEvent);
    });
    this.safeListenToEvent(window, "online", () => (this.online = true));

    this.safeReaction(
      () => this.clientStorage && fastClone(this.clientStorage),
      () => {
        if (this.clientStorage) {
          this.updateStorage();
        }
      }
    );
  }

  saveUpdates = () => {
    if (this.selection.length) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "updateElements",
            elements: fastClone(this.selection),
          },
        },
        "*"
      );
    }
  };

  onCreate = () => {
    if (this.loading) {
      return;
    }
    if (!this.validate()) {
      if (!this.urlValid) {
        this.errorMessage = "Please enter a valid URL";
        return;
      }
    }
    this.loading = true;
    if (this.urlValue) {
      const width = clamp(parseInt(this.width) || 1200, 200, 3000);
      const widthString = String(width);
      this.width = widthString;
      lsSet(WIDTH_LS_KEY, widthString);

      const apiRoot = this.apiRoot || "https://builder.io";

      const encocedUrl = encodeURIComponent(this.urlValue);

      lsSet(FRAMES_LS_KEY, this.useFrames);

      // We need to run the code to process DOM through a backend to run it in a headless browser.
      // Builder.io provides this for the Figma plugin for free.
      fetch(
        `${apiRoot}/api/v1/url-to-figma?url=${encocedUrl}&width=${width}&useFrames=${this.useFrames}`
      )
        .then((res) => {
          if (!res.ok) {
            console.error("Url-to-figma failed", res);
            throw new Error("Url-to-figma failed");
          }
          return res.json();
        })
        .then((data) => {
          const layers = data.layers;
          return Promise.all(
            [data].concat(
              layers.map(async (rootLayer: Node) => {
                await traverseLayers(rootLayer, (layer: any) => {
                  if (getImageFills(layer)) {
                    return processImages(layer).catch((err) => {
                      console.warn("Could not process image", err);
                    });
                  }
                });
              })
            )
          );
        })
        .then((data) => {
          parent.postMessage(
            { pluginMessage: { type: "import", data: data[0] } },
            "*"
          );
        })
        .catch((err) => {
          this.loading = false;
          console.error(err);
          alert(err);
        });
    }
  };

  onCancel = () => {
    parent.postMessage({ pluginMessage: { type: "cancel" } }, "*");
  };

  validate() {
    if (!this.form) {
      return false;
    }
    return this.form!.reportValidity();
  }

  selectAllUrlInputText() {
    const input = this.urlInputRef;
    if (input) {
      input.setSelectionRange(0, input.value.length);
    }
  }

  getLang() {
    return this.currentLanguage === "en" ? en : ru;
  }

  render() {
    return (
      <IntlProvider
        messages={this.currentLanguage === "en" ? en : ru}
        locale={this.currentLanguage}
        defaultLocale="en"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
            alignItems: "stretch",
            height: "100%",
          }}
        >
          <div
            style={{
              padding: 15,
              fontSize: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontWeight: "bold",
                }}
              >
                <FormattedMessage
                  id="title"
                  defaultMessage="Turn your design into code "
                />
                <a
                  style={{
                    color: themeVars.colors.primary,
                    marginLeft: 5,
                    fontWeight: "bold",
                    position: "relative",
                  }}
                  href="https://www.builder.io/c/docs/import-from-figma"
                  target="_blank"
                  rel="noopenner"
                >
                  <HelpOutline style={{ fontSize: 18 }} />
                </a>
              </div>
            </div>

            {!this.initialized ? (
              <div>
                <div style={{ display: "flex", padding: 20 }}>
                  <CircularProgress
                    size={30}
                    disableShrink
                    style={{ margin: "auto" }}
                  />
                </div>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    opacity: 0.6,
                    fontStyle: "italic",
                  }}
                >
                  <FormattedMessage
                    id="initExport"
                    defaultMessage="Initializing for export, this can take about a minute..."
                  />
                </div>
              </div>
            ) : this.generatingCode ? (
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", padding: 20 }}>
                  <CircularProgress
                    size={30}
                    disableShrink
                    style={{ margin: "auto" }}
                  />
                </div>
                <Typography
                  variant="caption"
                  style={{
                    textAlign: "center",
                    marginTop: 10,
                    color: themeVars.colors.primaryLight,
                    marginBottom: -10,
                    fontStyle: "italic",
                  }}
                >
                  <FormattedMessage
                    id="processing"
                    defaultMessage="Processing..."
                  />{" "}
                  <br />
                  <FormattedMessage
                    id="processing2"
                    defaultMessage="This can take about a minute..."
                  />
                </Typography>
              </div>
            ) : (
              <>
                {this.showImportInvalidError && (
                  <div>
                    <div
                      style={{
                        color: "rgb(200, 0, 0)",
                        marginTop: 10,
                        marginBottom: 10,
                      }}
                    >
                      <FormattedMessage
                        id="importLayerHelp"
                        defaultMessage="To import a layer, that layer and all children must use "
                      />
                      <a
                        style={{
                          color: themeVars.colors.primary,
                        }}
                        href="https://help.figma.com/hc/en-us/articles/360040451373-Create-dynamic-designs-with-Auto-layout"
                        target="_blank"
                        rel="noopenner"
                      >
                        <FormattedMessage
                          id="autolayout"
                          defaultMessage="autolayout"
                        />
                      </a>
                    </div>
                    <div>
                      <Button
                        size="small"
                        href="https://www.builder.io/c/docs/import-from-figma"
                        target="_blank"
                        color="primary"
                        rel="noopenner"
                      >
                        <FormattedMessage
                          id="learnMore"
                          defaultMessage="Learn more"
                        />
                      </Button>
                      <Button
                        size="small"
                        style={{ opacity: 0.5 }}
                        onClick={() => {
                          parent.postMessage(
                            {
                              pluginMessage: {
                                type: "clearErrors",
                                data: true,
                              },
                            },
                            "*"
                          );
                          this.showImportInvalidError = false;
                        }}
                      >
                        <FormattedMessage
                          id="clearErrors"
                          defaultMessage="Clear errors"
                        />
                      </Button>
                    </div>
                  </div>
                )}
                {this.showRequestFailedError && (
                  <div>
                    <div
                      style={{
                        color: "rgb(200, 0, 0)",
                        marginTop: 10,
                        marginBottom: 10,
                      }}
                    >
                      <FormattedMessage
                        id="errorMessage"
                        defaultMessage="Oh no, there was an error! To troubleshoot, if you are
                            importing a whole page, try importing a smaller part of the
                            page at a time, like one section or even one button"
                      />
                    </div>
                    <div>
                      <Button
                        size="small"
                        color="primary"
                        href="https://www.builder.io/c/docs/import-from-figma#troubleshooting"
                        target="_blank"
                        rel="noopenner"
                      >
                        <FormattedMessage
                          id="learnMore"
                          defaultMessage="Learn more"
                        />
                      </Button>
                      <Button
                        size="small"
                        style={{ opacity: 0.5 }}
                        onClick={() => {
                          this.showRequestFailedError = false;
                        }}
                      >
                        <FormattedMessage
                          id="clearErrors"
                          defaultMessage="Clear errors"
                        />
                      </Button>
                    </div>
                  </div>
                )}

                <Tooltip
                  disableHoverListener={Boolean(this.selection.length)}
                  title={this.getLang().selectLayerPop}
                >
                  <div>
                    <Button
                      fullWidth
                      style={{ marginTop: 20 }}
                      variant="contained"
                      onClick={(e) => {
                        this.getCode(true);
                      }}
                      disabled={!this.selection.length}
                      color="primary"
                    >
                      <FormattedMessage
                        id="getCode"
                        defaultMessage="Get Code"
                      />
                    </Button>
                  </div>
                </Tooltip>
                {this.displayFiddleUrl && (
                  <div style={{ margin: "15px 0 5px 0" }}>
                    <FormattedMessage id="done" defaultMessage="Done! " />
                    <a
                      style={{
                        color: themeVars.colors.primary,
                        fontWeight: "bold",
                        textDecoration: "none",
                      }}
                      rel="noopenner"
                      href={this.displayFiddleUrl}
                      target="_blank"
                    >
                      <FormattedMessage id="done" defaultMessage="Click here" />
                    </a>
                    <FormattedMessage
                      id="clickHere2"
                      defaultMessage=" to open your content in Builder.io and choose 'get code'"
                    />
                  </div>
                )}
                <Button
                  fullWidth
                  style={{ marginTop: 10, opacity: 0.4 }}
                  onClick={(e) => {
                    this.getCode(false);
                  }}
                  disabled={!this.selection.length}
                >
                  <FormattedMessage
                    id="downloadJson"
                    defaultMessage="Download json"
                  />
                </Button>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: "rgba(0, 0, 0, 0.5)",
                    fontStyle: "italic",
                    marginTop: 10,
                  }}
                >
                  <FormattedMessage
                    id="feedback"
                    defaultMessage="This feature is in beta. Please send "
                  />
                  <a
                    style={{
                      color: themeVars.colors.primary,
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                    target="_blank"
                    rel="noopener"
                    href="https://github.com/BuilderIO/figma-html/issues"
                  >
                    <FormattedMessage
                      id="feedback2"
                      defaultMessage="feedback"
                    />
                  </a>
                </div>
              </>
            )}
          </div>

          <div>
            <Divider />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                position: "relative",
                zIndex: 3,
                padding: 15,
                backgroundColor: "#f8f8f8",
                maxWidth: settings.ui.baseWidth,
                fontWeight: 400,
              }}
            >
              <form
                ref={(ref) => (this.form = ref)}
                // {...{ validate: 'true' }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  // marginTop: 20
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  this.onCreate();
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    paddingBottom: 18,
                    fontWeight: "bold",
                  }}
                >
                  <FormattedMessage
                    id="importDesigns"
                    defaultMessage="Import designs from the web"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", position: "relative" }}>
                    <TextField
                      inputProps={{
                        style: {
                          fontSize: 13,
                        },
                      }}
                      label={this.getLang().urlToImport}
                      fullWidth
                      inputRef={(ref) => (this.urlInputRef = ref)}
                      disabled={this.loading}
                      required
                      onKeyDown={(e) => {
                        // Default cmd + a functionality as weird
                        if ((e.metaKey || e.ctrlKey) && e.which === 65) {
                          e.stopPropagation();
                          e.preventDefault();
                          if (e.shiftKey) {
                            const input = this.urlInputRef!;
                            input.setSelectionRange(0, 0);
                          } else {
                            this.selectAllUrlInputText();
                          }
                        }
                      }}
                      placeholder="e.g. https://builder.io"
                      type="url"
                      value={this.urlValue}
                      onChange={(e) => {
                        let value = e.target.value.trim();
                        if (!value.match(/^https?:\/\//)) {
                          value = "http://" + value;
                        }
                        this.urlValue = value;
                      }}
                    />
                  </div>
                  {this.showMoreOptions && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        marginTop: 15,
                      }}
                    >
                      <div style={{ position: "relative", flexGrow: 1 }}>
                        <TextField
                          label={this.getLang().width}
                          required
                          inputProps={{
                            min: "200",
                            max: "3000",
                            step: "10",
                            style: {
                              fontSize: 13,
                            },
                          }}
                          disabled={this.loading}
                          onKeyDown={(e) => {
                            // Default cmd + a functionality as weird
                            if ((e.metaKey || e.ctrlKey) && e.which === 65) {
                              e.stopPropagation();
                              e.preventDefault();
                              if (e.shiftKey) {
                                const input = this.urlInputRef!;
                                input.setSelectionRange(0, 0);
                              } else {
                                const input = this.urlInputRef!;
                                input.setSelectionRange(
                                  0,
                                  input.value.length - 1
                                );
                              }
                            }
                          }}
                          placeholder="1200"
                          // style={{ marginLeft: 20 , width: 100  }}
                          fullWidth
                          type="number"
                          value={this.width}
                          onChange={(e) => {
                            this.width = String(
                              parseInt(e.target.value) || 1200
                            );
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            right: -4,
                            top: 18,
                            borderRadius: 100,
                            display: "flex",
                            ...(this.loading && {
                              pointerEvents: "none",
                              opacity: 0.5,
                            }),
                          }}
                        >
                          <IconButton
                            style={{
                              padding: 5,
                              color: this.width === "1200" ? "#888" : "#ddd",
                            }}
                            onClick={() => (this.width = "1200")}
                          >
                            <LaptopMac style={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton
                            style={{
                              padding: 5,
                              color: this.width === "900" ? "#888" : "#ddd",
                            }}
                            onClick={() => (this.width = "900")}
                          >
                            <TabletMac style={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton
                            style={{
                              padding: 5,
                              color: this.width === "400" ? "#888" : "#ddd",
                            }}
                            onClick={() => (this.width = "400")}
                          >
                            <PhoneIphone style={{ fontSize: 14 }} />
                          </IconButton>
                        </div>
                      </div>

                      <Tooltip
                        PopperProps={{
                          modifiers: { flip: { behavior: ["top"] } },
                        }}
                        enterDelay={300}
                        placement="top"
                        title={this.getLang().framesPop}
                      >
                        <FormControlLabel
                          value="Use Frames"
                          disabled={this.loading}
                          style={{ marginLeft: 20 }}
                          control={
                            <Switch
                              // disabled={this.loading}
                              size="small"
                              // style={{ marginLeft: 20 }}
                              color="primary"
                              checked={this.useFrames}
                              onChange={(e) =>
                                (this.useFrames = e.target.checked)
                              }
                            />
                          }
                          label={
                            <span
                              style={{
                                fontSize: 12,
                                opacity: 0.6,
                                position: "relative",
                                top: -5,
                              }}
                            >
                              <FormattedMessage
                                id="frames"
                                defaultMessage="Frames"
                              />
                            </span>
                          }
                          labelPlacement="top"
                        />
                      </Tooltip>
                    </div>
                  )}
                </div>
                {this.errorMessage && (
                  <div
                    style={{
                      color: "#721c24",
                      backgroundColor: "#f8d7da",
                      border: "1px solid #f5c6cb",
                      borderRadius: 4,
                      padding: ".75rem 1.25rem",
                      marginTop: 20,
                    }}
                  >
                    {this.errorMessage}
                  </div>
                )}
                {!this.online && (
                  <div
                    style={{
                      color: "#721c24",
                      backgroundColor: "#f8d7da",
                      border: "1px solid #f5c6cb",
                      borderRadius: 4,
                      padding: ".75rem 1.25rem",
                      marginTop: 20,
                    }}
                  >
                    <FormattedMessage
                      id="needOnline"
                      defaultMessage="You need to be online to use this plugin"
                    />
                  </div>
                )}
                {this.loading ? (
                  <>
                    <div style={{ margin: "0 auto" }} className="lds-ellipsis">
                      <div
                        style={{ background: themeVars.colors.primaryLight }}
                      />
                      <div
                        style={{ background: themeVars.colors.primaryLight }}
                      />
                      <div
                        style={{ background: themeVars.colors.primaryLight }}
                      />
                      <div
                        style={{ background: themeVars.colors.primaryLight }}
                      />
                    </div>
                    <Typography
                      variant="caption"
                      style={{
                        textAlign: "center",
                        // marginTop: 10,
                        color: themeVars.colors.primaryLight,
                        marginBottom: -10,
                        // fontStyle: "italic"
                      }}
                    >
                      <FormattedMessage
                        id="processingCode"
                        defaultMessage="Processing code..."
                      />
                      <br />
                      <FormattedMessage
                        id="processingCode2"
                        defaultMessage="This can take a couple minutes..."
                      />
                    </Typography>
                  </>
                ) : (
                  <>
                    <Button
                      type="submit"
                      disabled={Boolean(
                        this.errorMessage || this.loading || !this.online
                      )}
                      style={{ marginTop: 20 }}
                      fullWidth
                      color="primary"
                      variant="outlined"
                      onClick={this.onCreate}
                    >
                      <FormattedMessage id="import" defaultMessage="Import" />
                    </Button>
                    <div
                      style={{
                        color: "#888",
                        fontSize: 12,
                        textAlign: "center",
                        marginTop: 15,
                        userSelect: "none",
                        marginBottom: -10,
                      }}
                    >
                      <FormattedMessage
                        id="orTry"
                        defaultMessage="Or try our "
                      />
                      <a
                        style={{
                          color: themeVars.colors.primary,
                          cursor: "pointer",
                          textDecoration: "none",
                        }}
                        href="https://chrome.google.com/webstore/detail/efjcmgblfpkhbjpkpopkgeomfkokpaim"
                        target="_blank"
                      >
                        <FormattedMessage
                          id="orTry2"
                          defaultMessage="chrome extension"
                        />
                      </a>
                      <FormattedMessage
                        id="orTry3"
                        defaultMessage=" to capture a page in your browser and"
                      />
                      <a
                        onClick={() => {
                          const input = document.createElement("input");

                          input.type = "file";
                          document.body.appendChild(input);
                          input.style.visibility = "hidden";
                          input.click();

                          const onFocus = () => {
                            setTimeout(() => {
                              if (
                                input.parentElement &&
                                (!input.files || input.files.length === 0)
                              ) {
                                done();
                              }
                            }, 200);
                          };

                          const done = () => {
                            input.remove();
                            this.loading = false;
                            window.removeEventListener("focus", onFocus);
                          };

                          window.addEventListener("focus", onFocus);

                          // TODO: parse and upload images!
                          input.addEventListener("change", (event) => {
                            const file = (event.target as HTMLInputElement)
                              .files![0];
                            if (file) {
                              this.loading = true;
                              var reader = new FileReader();

                              // Closure to capture the file information.
                              reader.onload = (e) => {
                                const text = (e.target as any).result;
                                try {
                                  const json = JSON.parse(text);
                                  Promise.all(
                                    json.layers.map(async (rootLayer: Node) => {
                                      await traverseLayers(
                                        rootLayer,
                                        (layer: any) => {
                                          if (getImageFills(layer)) {
                                            return processImages(layer).catch(
                                              (err) => {
                                                console.warn(
                                                  "Could not process image",
                                                  err
                                                );
                                              }
                                            );
                                          }
                                        }
                                      );
                                    })
                                  )
                                    .then(() => {
                                      parent.postMessage(
                                        {
                                          pluginMessage: {
                                            type: "import",
                                            data: json,
                                          },
                                        },
                                        "*"
                                      );
                                      setTimeout(() => {
                                        done();
                                      }, 1000);
                                    })
                                    .catch((err) => {
                                      done();
                                      console.error(err);
                                      alert(err);
                                    });
                                } catch (err) {
                                  alert("File read error: " + err);
                                  done();
                                }
                              };

                              reader.readAsText(file);
                            } else {
                              done();
                            }
                          });
                        }}
                        style={{
                          color: themeVars.colors.primary,
                          cursor: "pointer",
                        }}
                      >
                        <FormattedMessage
                          id="orTry4"
                          defaultMessage=" upload here "
                        />
                      </a>
                    </div>
                  </>
                )}
              </form>
            </div>
            <Divider />

            {useDev && (
              <div
                onClick={() => {
                  lsSet("builder.env", "production");
                }}
                style={{
                  padding: 10,
                  color: "rgb(200, 0, 0)",
                  textAlign: "center",
                }}
              >
                Using dev env. Click here to reset then reload the extension
              </div>
            )}

            <div style={{ marginTop: 20, textAlign: "center", color: "#666" }}>
              <FormattedMessage id="made" defaultMessage="Made with " />
              <Favorite
                style={{
                  color: "rgb(236, 55, 88)",
                  fontSize: 16,
                  marginTop: -2,
                  verticalAlign: "middle",
                }}
              />
              <FormattedMessage id="made2" defaultMessage=" by " />
              <a
                style={{ color: themeVars.colors.primary }}
                href="https://www.builder.io?ref=figma"
                target="_blank"
              >
                Builder.io
              </a>
            </div>

            <div
              style={{
                marginTop: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Select
                style={{
                  opacity: 0.3,
                  fontSize: "11px",
                  fontWeight: 600,
                }}
                id="demo-simple-select"
                value={this.currentLanguage}
                onChange={(e) =>
                  (this.currentLanguage = (e.target as HTMLInputElement).value)
                }
              >
                <StyledButton value="en">EN</StyledButton>
                <StyledButton value="ru">RU</StyledButton>
              </Select>
            </div>

            <div
              style={{
                marginTop: 20,
                textAlign: "center",
                color: "#999",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 400,
                fontSize: 9,
                paddingBottom: 10,
              }}
            >
              <a
                style={{
                  color: "#999",
                  textDecoration: "none",
                }}
                href="https://github.com/BuilderIO/html-to-figma/issues"
                target="_blank"
              >
                <FormattedMessage
                  id="feedbackFooter"
                  defaultMessage="Feedback"
                />
              </a>
              <span
                style={{
                  display: "inline-block",
                  height: 10,
                  width: 1,
                  background: "#999",
                  marginTop: 1,
                  opacity: 0.8,
                  marginLeft: 5,
                }}
              />
              <a
                style={{
                  color: "#999",
                  textDecoration: "none",
                  marginLeft: 5,
                }}
                href="https://github.com/BuilderIO/html-to-figma"
                target="_blank"
              >
                <FormattedMessage id="source" defaultMessage="Source" />
              </a>
              <span
                style={{
                  display: "inline-block",
                  height: 10,
                  width: 1,
                  background: "#999",
                  marginTop: 1,
                  opacity: 0.8,
                  marginLeft: 5,
                }}
              />
              <a
                style={{
                  color: "#999",
                  textDecoration: "none",
                  marginLeft: 5,
                }}
                href="https://github.com/BuilderIO/html-to-figma"
                target="_blank"
              >
                <FormattedMessage id="help" defaultMessage="Help" />
              </a>
            </div>
          </div>
        </div>
      </IntlProvider>
    );
  }
}

ReactDOM.render(
  <MuiThemeProvider theme={theme}>
    <>
      <CssBaseline />
      <App />
    </>
  </MuiThemeProvider>,
  document.getElementById("react-page")
);
