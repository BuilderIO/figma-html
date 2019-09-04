import {
  Button,
  createMuiTheme,
  CssBaseline,
  Divider,
  FormControlLabel,
  IconButton,
  ListItemIcon,
  MenuItem,
  MuiThemeProvider,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import green from "@material-ui/core/colors/green";
import { SvgIconProps } from "@material-ui/core/SvgIcon";
import Brush from "@material-ui/icons/Brush";
import GridOn from "@material-ui/icons/GridOn";
import LaptopMac from "@material-ui/icons/LaptopMac";
import MoreHoriz from "@material-ui/icons/MoreHoriz";
import PhoneIphone from "@material-ui/icons/PhoneIphone";
import SettingsEthernet from "@material-ui/icons/SettingsEthernet";
import TabletMac from "@material-ui/icons/TabletMac";
import ViewColumn from "@material-ui/icons/ViewColumn";
import * as escapeHtml from "escape-html";
import * as fileType from "file-type";
import { action, computed, observable, when } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  figmaToBuilder,
  getAssumeLayoutTypeForNode
} from "../lib/figma-to-builder";
import { SafeComponent } from "./classes/safe-component";
import { settings } from "./constants/settings";
import { theme as themeVars } from "./constants/theme";
import { fastClone } from "./functions/fast-clone";
import { traverseLayers } from "./functions/traverse-layers";
import "./ui.css";
import { BuilderElement } from "@builder.io/sdk";

const WIDTH_LS_KEY = "builder.widthSetting";
const FRAMES_LS_KEY = "builder.useFramesSetting";
const EXPERIMENTS_LS_KEY = "builder.showExperiments";
const MORE_OPTIONS_LS_KEY = "builder.showMoreOptions";

const EDITOR_TAG: any = "builder-editor";

// TODO: make async and use figma.clientStorage
function lsGet(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key)!);
  } catch (err) {
    console.debug("Could not get from local storage", err);
    return undefined;
  }
}
function lsSet(key: string, value: any) {
  try {
    return localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.debug("Could not set to local storage", err);
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
    secondary: green
  }
});

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
    layer.fills.filter(item => item.type === "IMAGE");
  return images;
}

// const imageCache: { [key: string]: Uint8Array | undefined } = {};
// TODO: CACHE!
async function processImages(layer: Node) {
  const images = getImageFills(layer);

  const convertToSvg = (value: string) => {
    (layer as any).type = "SVG";
    (layer as any).svg = value;
    if (typeof layer.fills !== "symbol") {
      layer.fills = layer.fills.filter(item => item.type !== "IMAGE");
    }
  };
  return images
    ? Promise.all(
        images.map(async image => {
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

export type Component =
  | "row"
  | "columns"
  | "grid"
  | "stack"
  | "absolute"
  | "scroll";
const componentTypes: Component[] = [
  "stack",
  "columns",
  "grid",
  "row" // TODO: treat this as grid
  // "absolute",
  // "scroll"
];

const icons: { [key in Component]: React.ComponentType } = {
  row: MoreHoriz,
  // stack: MoreVert,
  stack: (props: SvgIconProps) => (
    <ViewColumn
      {...props}
      style={{
        ...props.style,
        transform: "rotateZ(90deg)"
      }}
    />
  ),
  grid: GridOn,
  // grid: MoreHoriz,
  scroll: SettingsEthernet,
  columns: ViewColumn,
  absolute: Brush
};

const componentDescription: { [key in Component]: string } = {
  row: "Children always sit side by side",
  stack: "Stack children vertically",
  grid: "Children go horizontally and wrap to new lines",
  scroll: "Children scroll left/right on overflow",
  columns: "Children sit side by side and stack vertically for smaller devices",
  absolute: "Children are absolute positioned in place"
};

const invalidComponentOption = "...";
type InvalidComponentOption = typeof invalidComponentOption;

@observer
class App extends SafeComponent {
  editorRef: HTMLIFrameElement | null = null;

  @observable loading = false;
  @observable apiRoot =
    process.env.API_ROOT && process.env.NODE_ENV !== "production"
      ? process.env.API_ROOT
      : "https://builder.io";

  @observable generatingCode = false;
  @observable urlValue = "https://builder.io";
  @observable width = lsGet(WIDTH_LS_KEY) || "1200";
  @observable online = navigator.onLine;
  @observable useFrames = lsGet(FRAMES_LS_KEY) || false;
  @observable showExperimental =
    lsGet(EXPERIMENTS_LS_KEY) ||
    process.env.NODE_ENV === "development" ||
    false;
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
  @observable showBuilderPreview = false;
  @observable.ref previewData: any;
  editorScriptAdded = false;

  dataToPost: any;

  @computed get showExperimentalLink() {
    return (
      this.showExperimental ||
      (this.commandKeyDown && this.shiftKeyDown && this.altKeyDown)
    );
  }

  @observable errorMessage = "";

  @computed get component() {
    if (!this.selection.length) {
      return invalidComponentOption;
    }
    const firstNode = this.selection[0];
    let value = getAssumeLayoutTypeForNode(firstNode as any) as any;
    for (const item of this.selection.slice(1)) {
      const itemValue = getAssumeLayoutTypeForNode(item as any) as any;
      if (itemValue !== value) {
        return invalidComponentOption;
      }
    }
    return value;
  }

  set component(component: Component | typeof invalidComponentOption) {
    for (const node of this.selection) {
      if (!node.data) {
        node.data = {
          component
        };
      } else {
        node.data.component = component;
      }
      console.log("setting node.data.component");
    }
    console.log(
      "set component",
      component,
      JSON.stringify(this.selection.map(item => item.data), null, 2)
    );
    this.saveUpdates();
  }

  form: HTMLFormElement | null = null;
  urlInputRef: HTMLInputElement | null = null;

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

  componentDidMount() {
    // TODO: destroy on component unmount
    this.safeReaction(() => this.urlValue, () => (this.errorMessage = ""));
    this.safeReaction(
      () => this.showBuilderPreview,
      showBuilderPreview => {
        if (showBuilderPreview && !this.editorScriptAdded) {
          const script = document.createElement("script");
          script.src = "https://cdn.builder.io/js/editor@1.0.38-1";
          script.async = true;
          document.body.appendChild(script);
          this.editorScriptAdded = true;
        }
      }
    );
    this.selectAllUrlInputText();

    this.safeListenToEvent(window, "offline", () => (this.online = false));
    this.safeListenToEvent(window, "keydown", e => {
      this.updateKeyPositions(e as KeyboardEvent);
    });
    this.safeListenToEvent(window, "keyup", e => {
      this.updateKeyPositions(e as KeyboardEvent);
    });
    this.safeListenToEvent(window, "online", () => (this.online = true));

    this.safeListenToEvent(window, "message", e => {
      const { data: rawData, source } = e as MessageEvent;

      const data = rawData.pluginMessage;
      if (!data) {
        return;
      }
      if (data.type === "selectionChange") {
        this.selection = data.elements;
      }
      if (data.type === "selectionWithImages") {
        console.log("selection with images", data);
        this.selectionWithImages = data.elements;
      }
      if (data.type === "doneLoading") {
        this.loading = false;
      }
    });

    this.safeReaction(
      () =>
        `${this.showMoreOptions}:${this.showExperimental}:${this.showBuilderPreview}"`,
      () => {
        let height = settings.ui.baseHeight;
        if (this.showMoreOptions) {
          height += 50;
        }
        if (this.showExperimental) {
          height += 300;
        }
        parent.postMessage(
          {
            pluginMessage: {
              type: "resize",
              width:
                settings.ui.baseWidth + (this.showBuilderPreview ? 300 : 0),
              height
            }
          },
          "*"
        );
      }
    );
  }

  saveUpdates = () => {
    if (this.selection.length) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "updateElements",
            elements: fastClone(this.selection)
          }
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
        .then(res => res.json())
        .then(data => {
          console.log("data", data);
          const layers = data.layers;
          return Promise.all(
            [data].concat(
              layers.map(async (rootLayer: Node) => {
                await traverseLayers(rootLayer, layer => {
                  if (getImageFills(layer)) {
                    return processImages(layer).catch(err => {
                      console.warn("Could not process image", err);
                    });
                  }
                });
              })
            )
          );
        })
        .then(data => {
          parent.postMessage(
            { pluginMessage: { type: "import", data: data[0] } },
            "*"
          );
        })
        .catch(err => {
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

  render() {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: 15,
          fontWeight: 400
        }}
      >
        {/* <Typography style={{ textAlign: "center", marginTop: 0 }} variant="h6">
          Import from URL
        </Typography> */}

        <form
          ref={ref => (this.form = ref)}
          // {...{ validate: 'true' }}
          style={{
            display: "flex",
            flexDirection: "column"
            // marginTop: 20
          }}
          onSubmit={e => {
            e.preventDefault();
            this.onCreate();
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {this.showExperimental && (
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: 11,
                  marginBottom: 10
                }}
              >
                Import from code
              </div>
            )}
            <div style={{ display: "flex", position: "relative" }}>
              <TextField
                inputProps={{
                  style: {
                    fontSize: 13
                  }
                }}
                label="URL to import"
                autoFocus
                fullWidth
                inputRef={ref => (this.urlInputRef = ref)}
                disabled={this.loading}
                required
                onKeyDown={e => {
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
                onChange={e => {
                  let value = e.target.value.trim();
                  if (!value.match(/^https?:\/\//)) {
                    value = "http://" + value;
                  }
                  this.urlValue = value;
                }}
              />
              {/* <div
                style={{
                  position: "absolute",
                  right: -8,
                  top: 11,
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  borderRadius: 100
                }}
              >
                <Tooltip
                  placement="left"
                  title="More options"
                  enterDelay={1000}
                >
                  <IconButton
                    style={{
                      padding: 5,
                      color: "#bbb"
                    }}
                    onClick={() => {
                      this.showMoreOptions = !this.showMoreOptions;
                      lsSet(MORE_OPTIONS_LS_KEY, this.showMoreOptions);
                    }}
                  >
                    <ExpandMore
                      style={{
                        transition: "transform 0.2s ease-in-out",
                        transform: this.showMoreOptions
                          ? "rotateZ(180deg)"
                          : "none"
                      }}
                      fontSize="small"
                    />
                  </IconButton>
                </Tooltip>
              </div> */}
            </div>
            {this.showMoreOptions && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  marginTop: 15
                }}
              >
                <div style={{ position: "relative", flexGrow: 1 }}>
                  <TextField
                    label="Width"
                    required
                    inputProps={{
                      min: "200",
                      max: "3000",
                      step: "10",
                      style: {
                        fontSize: 13
                      }
                    }}
                    disabled={this.loading}
                    onKeyDown={e => {
                      // Default cmd + a functionality as weird
                      if ((e.metaKey || e.ctrlKey) && e.which === 65) {
                        e.stopPropagation();
                        e.preventDefault();
                        if (e.shiftKey) {
                          const input = this.urlInputRef!;
                          input.setSelectionRange(0, 0);
                        } else {
                          const input = this.urlInputRef!;
                          input.setSelectionRange(0, input.value.length - 1);
                        }
                      }
                    }}
                    placeholder="1200"
                    // style={{ marginLeft: 20 , width: 100  }}
                    fullWidth
                    type="number"
                    value={this.width}
                    onChange={e => {
                      this.width = String(parseInt(e.target.value) || 1200);
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: -4,
                      top: 18,
                      backgroundColor: "white",
                      borderRadius: 100,
                      display: "flex",
                      ...(this.loading && {
                        pointerEvents: "none",
                        opacity: 0.5
                      })
                    }}
                  >
                    <IconButton
                      style={{
                        padding: 5,
                        color: this.width === "1200" ? "#888" : "#ddd"
                      }}
                      onClick={() => (this.width = "1200")}
                    >
                      <LaptopMac style={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton
                      style={{
                        padding: 5,
                        color: this.width === "900" ? "#888" : "#ddd"
                      }}
                      onClick={() => (this.width = "900")}
                    >
                      <TabletMac style={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton
                      style={{
                        padding: 5,
                        color: this.width === "400" ? "#888" : "#ddd"
                      }}
                      onClick={() => (this.width = "400")}
                    >
                      <PhoneIphone style={{ fontSize: 14 }} />
                    </IconButton>
                  </div>
                </div>
                {this.showExperimental && (
                  <Tooltip
                    PopperProps={{
                      modifiers: { flip: { behavior: ["top"] } }
                    }}
                    enterDelay={300}
                    placement="top"
                    title="Nest layers in frames"
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
                          value={this.useFrames}
                          onChange={e => (this.useFrames = e.target.checked)}
                        />
                      }
                      label={
                        <span
                          style={{
                            fontSize: 12,
                            opacity: 0.6,
                            position: "relative",
                            top: -5
                          }}
                        >
                          Frames
                        </span>
                      }
                      labelPlacement="top"
                    />
                  </Tooltip>
                )}
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
                marginTop: 20
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
                marginTop: 20
              }}
            >
              You need to be online to use this plugin
            </div>
          )}
          {this.loading ? (
            <>
              <div style={{ margin: "0 auto" }} className="lds-ellipsis">
                <div style={{ background: themeVars.colors.primaryLight }} />
                <div style={{ background: themeVars.colors.primaryLight }} />
                <div style={{ background: themeVars.colors.primaryLight }} />
                <div style={{ background: themeVars.colors.primaryLight }} />
              </div>
              <Typography
                variant="caption"
                style={{
                  textAlign: "center",
                  // marginTop: 10,
                  color: themeVars.colors.primaryLight,
                  marginBottom: -10
                  // fontStyle: "italic"
                }}
              >
                Analyzing code... <br />
                This can take a couple minutes...
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
                variant="contained"
                onClick={this.onCreate}
              >
                Import
              </Button>
              <Tooltip title="Import a file from the HTML to Figma Chrome Extnesion">
                <Button
                  type="submit"
                  onClick={() => {
                    this.loading = true;
                    const input = document.createElement("input");
                    input.type = "file";
                    document.body.appendChild(input);
                    input.click();

                    // TODO: parse and upload images!
                    input.addEventListener("change", event => {
                      const file = (event.target as any).files[0];
                      if (file) {
                        var reader = new FileReader();

                        // Closure to capture the file information.
                        reader.onload = e => {
                          const text = (e.target as any).result;
                          try {
                            const json = JSON.parse(text);
                            Promise.all(
                              json.layers.map(async (rootLayer: Node) => {
                                await traverseLayers(rootLayer, layer => {
                                  if (getImageFills(layer)) {
                                    return processImages(layer).catch(err => {
                                      console.warn(
                                        "Could not process image",
                                        err
                                      );
                                    });
                                  }
                                });
                              })
                            )
                              .then(() => {
                                parent.postMessage(
                                  {
                                    pluginMessage: {
                                      type: "import",
                                      data: json
                                    }
                                  },
                                  "*"
                                );
                              })
                              .catch(err => {
                                this.loading = false;
                                console.error(err);
                                alert(err);
                              });
                          } catch (err) {
                            alert("File read error: " + err);
                            this.loading = false;
                          }
                          input.remove();
                        };

                        reader.readAsText(file);
                      } else {
                        this.loading = false;
                      }
                    });
                  }}
                  style={{ marginTop: 20, fontWeight: 200 }}
                  fullWidth
                  color="primary"
                >
                  Upload .figma.json file
                </Button>
              </Tooltip>
            </>
          )}
        </form>
        {this.showExperimental && (
          <>
            <div
              style={{
                marginTop: 15,
                marginBottom: 15
              }}
            >
              <Divider style={{ margin: "0 -15px" }} />
              <div style={{ fontSize: 11 }}>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: 11,
                    marginTop: 15
                  }}
                >
                  Export to code
                </div>

                {!this.selection.length && (
                  <div style={{ marginTop: 15, color: "#888" }}>
                    {this.selection.length} elements selected
                  </div>
                )}
                {!!this.selection.length && (
                  <div style={{ marginTop: 15, color: "#888" }}>
                    {/* Hello */}
                    <TextField
                      SelectProps={{
                        renderValue: (val: any) => (
                          <span
                            style={{
                              textTransform: "capitalize",
                              fontSize: 12,
                              opacity:
                                this.selection[0] &&
                                this.selection[0].data &&
                                this.selection[0].data.component
                                  ? 1
                                  : 0.5
                            }}
                          >
                            {val}
                          </span>
                        )
                      }}
                      label="Component type"
                      select
                      fullWidth
                      value={this.component}
                      onChange={e => {
                        let value = e.target.value;
                        if (value === invalidComponentOption) {
                          value = undefined as any;
                        }

                        this.component = value as Component;
                      }}
                    >
                      {(componentTypes as string[])
                        .concat([invalidComponentOption])
                        .map(item => {
                          const Icon = icons[item as Component];
                          const text =
                            componentDescription[item as Component] || "";
                          return (
                            <MenuItem
                              key={item}
                              style={{
                                fontSize: 12,
                                textTransform: "capitalize",
                                opacity:
                                  item === invalidComponentOption ? 0.5 : 1
                              }}
                              value={item}
                            >
                              <Tooltip
                                enterDelay={500}
                                title={text}
                                key={item}
                                open={text ? undefined : false}
                              >
                                <>
                                  <ListItemIcon>
                                    {Icon ? <Icon /> : <></>}
                                  </ListItemIcon>
                                  {item}
                                </>
                              </Tooltip>
                            </MenuItem>
                          );
                        })}
                    </TextField>

                    {this.generatingCode && (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div
                          style={{ margin: "10px auto 0" }}
                          className="lds-ellipsis"
                        >
                          <div
                            style={{
                              background: themeVars.colors.primaryLight
                            }}
                          />
                          <div
                            style={{
                              background: themeVars.colors.primaryLight
                            }}
                          />
                          <div
                            style={{
                              background: themeVars.colors.primaryLight
                            }}
                          />
                          <div
                            style={{
                              background: themeVars.colors.primaryLight
                            }}
                          />
                        </div>
                        <Typography
                          variant="caption"
                          style={{
                            textAlign: "center",
                            // marginTop: 10,
                            color: themeVars.colors.primaryLight,
                            marginBottom: 10
                            // fontStyle: "italic"
                          }}
                        >
                          Generating code...
                        </Typography>
                      </div>
                    )}

                    {/* TODO: check validitiy and prompt, select all elements not valid */}
                    {!this.generatingCode && (
                      <Button
                        style={{ marginTop: 15, fontWeight: 400 }}
                        fullWidth
                        disabled={this.generatingCode}
                        color="primary"
                        variant="contained"
                        onClick={async () => {
                          this.selectionWithImages = null;
                          parent.postMessage(
                            {
                              pluginMessage: {
                                type: "getSelectionWithImages"
                              }
                            },
                            "*"
                          );

                          this.generatingCode = true;

                          await when(() => !!this.selectionWithImages);

                          if (
                            !(
                              this.selectionWithImages &&
                              this.selectionWithImages[0]
                            )
                          ) {
                            console.warn("No selection with images");
                            return;
                          }

                          // TODO: analyze if page is properly nested and annotated, if not
                          // suggest in the UI what needs grouping
                          const block = figmaToBuilder(this
                            .selectionWithImages[0] as any);

                          const data = {
                            data: {
                              blocks: [block]
                            }
                          };

                          const USE_FORM = false;
                          if (USE_FORM) {
                            const json = JSON.stringify(data);
                            const div = document.createElement("div");
                            div.innerHTML = `
                                <form method='POST' enctype='text/plain' target="_blank" action="http://localhost:5000/import-doc?url=http://localhost:1234">
                                <input name='{"doc": ${escapeHtml(
                                  json
                                )}, "_": "' value='"}'>
                                <button type="submit"></button>
                                </form>
                            `;

                            document.body.appendChild(div);
                            const button = div.querySelector(
                              "button[type=submit]"
                            );
                            if (button instanceof HTMLElement) {
                              button.click();
                            }
                            div.remove();
                            this.generatingCode = false;
                            this.selectionWithImages = null;
                            return;
                          }

                          var json = JSON.stringify(data);
                          var blob = new Blob([json], {
                            type: "application/json"
                          });

                          const link = document.createElement("a");
                          link.setAttribute("href", URL.createObjectURL(blob));
                          link.setAttribute("download", "page.builder.json");
                          document.body.appendChild(link); // Required for FF

                          link.click();
                          document.body.removeChild(link);

                          this.generatingCode = false;
                          this.selectionWithImages = null;
                        }}
                      >
                        Export to code
                      </Button>
                    )}

                    <Button
                      style={{
                        marginTop: 15,
                        fontWeight: 400
                        // marginLeft: 15
                      }}
                      fullWidth
                      disabled={this.generatingCode}
                      color="primary"
                      variant="contained"
                      onClick={async () => {
                        this.showBuilderPreview = true; // !this.showBuilderPreview;
                        this.selectionWithImages = null;
                        parent.postMessage(
                          {
                            pluginMessage: {
                              type: "getSelectionWithImages"
                            }
                          },
                          "*"
                        );

                        await when(() => !!this.selectionWithImages);

                        if (
                          !(
                            this.selectionWithImages &&
                            this.selectionWithImages[0]
                          )
                        ) {
                          console.warn("No selection with images");
                          return;
                        }

                        // TODO: analyze if page is properly nested and annotated, if not
                        // suggest in the UI what needs grouping
                        const block = figmaToBuilder(this
                          .selectionWithImages[0] as any);

                        const previewData = fastClone({
                          modelId: "dummy",
                          data: {
                            blocks: [block]
                          }
                        });
                        // console.log('ref?', this.editorRef, previewData)
                        // ;(window as any).ref = this.editorRef
                        // if (this.editorRef) {
                        //   this.editorRef.data = previewData
                        // }
                        if (this.editorRef && this.editorRef.contentWindow) {
                          this.editorRef.contentWindow.postMessage(
                            {
                              type: "builder.contentUpdate",
                              data: {
                                key: "page",
                                data: previewData
                              }
                            },
                            "*"
                          );
                        }
                        // const frame = document.querySelector(
                        //   "builder-editor iframe"
                        // );
                        // if (frame instanceof HTMLIFrameElement) {
                        //   if (frame.contentWindow) {
                        //     frame.contentWindow.postMessage(
                        //       {
                        //         type: "builder.updateEditorData",
                        //         data: {
                        //           data: previewData
                        //         }
                        //       },
                        //       "*"
                        //     );
                        //   }
                        // }
                        this.selectionWithImages = null;
                      }}
                    >
                      Live preview
                    </Button>
                    {this.showBuilderPreview && (
                      <div style={{ width: "100%", marginTop: 15 }}>
                        <div
                          style={{
                            // width: "300%",
                            height: 600,
                            // transform: "scale(0.33) translateZ(0)",
                            // transformOrigin: "top left",
                            display: "flex",
                            flexDirection: "column"
                          }}
                        >
                          <iframe
                            ref={ref => (this.editorRef = ref)}
                            style={{
                              width: "100%",
                              border: 0,
                              height: "100%"
                            }}
                            src="https://preview.builder.live?model=page&amp;apiKey=123&amp;builder.cachebust=true&amp;builder.preview=page&amp;builder.noCache=true&amp;builder.frameEditing=page"
                          ></iframe>
                          {/* <EDITOR_TAG
                            // data={this.previewData}
                            host="https://6648e9ad.ngrok.io"
                            style={{
                              width: "100%",
                              height: "100%"
                            }}
                            env="qa"
                            ref={(ref: any) => (this.editorRef = ref)}
                            api-key="builder"
                          /> */}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Divider style={{ margin: "0 -15px", marginTop: 15 }} />
            </div>
            <div
              style={{
                marginBottom: 10
              }}
            >
              <div style={{ fontSize: 11 }}>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: 11
                  }}
                >
                  Dev options
                </div>
                <TextField
                  label="API Root"
                  fullWidth
                  style={{ marginTop: 15 }}
                  inputProps={{
                    style: {
                      fontSize: 13
                    }
                  }}
                  value={this.apiRoot}
                  placeholder="https://builder.io"
                  onChange={e => {
                    this.apiRoot = e.target.value;
                  }}
                />
              </div>
            </div>
            <Divider style={{ margin: "0 -15px" }} />
          </>
        )}

        <div style={{ marginTop: 20, textAlign: "center", color: "#666" }}>
          Made with ❤️ by{" "}
          <a
            style={{ color: themeVars.colors.primary }}
            href="https://builder.io?ref=figma"
            target="_blank"
          >
            Builder.io
          </a>
        </div>

        <div
          style={{
            marginTop: 25,
            textAlign: "center",
            color: "#999",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.8,
            fontWeight: 400,
            fontSize: 9
          }}
        >
          <a
            style={{
              color: "#999",
              textDecoration: "none"
            }}
            href="https://github.com/BuilderIO/html-to-figma/issues"
            target="_blank"
          >
            Feedback
          </a>
          <span
            style={{
              display: "inline-block",
              height: 10,
              width: 1,
              background: "#999",
              marginTop: 1,
              opacity: 0.8,
              marginLeft: 5
            }}
          />
          <a
            style={{
              color: "#999",
              textDecoration: "none",
              marginLeft: 5
            }}
            href="https://github.com/BuilderIO/html-to-figma"
            target="_blank"
          >
            Source
          </a>
          {this.showExperimentalLink && (
            <>
              <span
                style={{
                  display: "inline-block",
                  height: 10,
                  width: 1,
                  background: "#999",
                  marginTop: 1,
                  opacity: 0.8,
                  marginLeft: 5
                }}
              />
              <a
                style={{
                  color: this.showExperimental
                    ? themeVars.colors.primary
                    : "#999",
                  textDecoration: "none",
                  marginLeft: 5,
                  cursor: "pointer",
                  userSelect: "none"
                }}
                onClick={e => {
                  e.preventDefault();
                  this.showExperimental = !this.showExperimental;
                  lsSet(EXPERIMENTS_LS_KEY, this.showExperimental);
                }}
              >
                Experiments
              </a>
            </>
          )}
        </div>
      </div>
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
