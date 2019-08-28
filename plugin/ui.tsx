import * as React from "react";
import * as ReactDOM from "react-dom";
import { observable, computed } from "mobx";
import { observer } from "mobx-react";
import {
  createMuiTheme,
  MuiThemeProvider,
  CssBaseline,
  TextField,
  Button,
  Typography,
  Switch,
  Tooltip,
  FormControlLabel,
  Divider,
  MenuItem,
  IconButton
} from "@material-ui/core";
import ExpandMore from "@material-ui/icons/ExpandMore";
import green from "@material-ui/core/colors/green";
import { theme as themeVars } from "./constants/theme";
import "./ui.css";
import { SafeComponent } from "./classes/safe-component";
import Loading from "./components/loading";
import { traverseLayers } from "./functions/traverse-layers";
import { settings } from "./constants/settings";
import { fastClone } from "./functions/fast-clone";

declare var process: {
  env: {
    NODE_ENV: "production" | "development" | undefined;
    API_ROOT: string | undefined;
  };
};

const WIDTH_LS_KEY = "builder.widthSetting";
const FRAMES_LS_KEY = "builder.useFramesSetting";

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
  return images
    ? Promise.all(
        images.map(image => {
          if (image) {
            const url = image.url;
            if (url.startsWith("data:")) {
              const type = url.split(/[:,;]/)[1];
              if (type.includes("svg")) {
                const svgValue = decodeURIComponent(url.split(",")[1]);
                (layer as any).type = "SVG";
                (layer as any).svg = svgValue;
                layer.fills = [];
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
                return Promise.resolve();
              }
            }
            return fetch(
              "https://builder.io/api/v1/proxy-api?url=" +
                encodeURIComponent(url)
            )
              .then(res => res.arrayBuffer())
              .then(buffer => {
                const intArr = new Uint8Array(buffer);
                delete image.url;
                image.intArr = intArr;
              })
              .catch(err => {
                console.warn("Image fetch error", err, image, layer);
              });
          }
          return Promise.resolve();
        })
      )
    : Promise.resolve([]);
}

type Component = "row" | "columns" | "grid" | "stack" | "canvas";
const componentTypes: Component[] = [
  "row",
  "columns",
  "grid",
  "stack",
  "canvas"
];

const invalidComponentOption = "...";
type InvalidComponentOption = typeof invalidComponentOption;

@observer
class App extends SafeComponent {
  @observable loading = false;
  @observable urlValue = "https://builder.io";
  @observable width = lsGet(WIDTH_LS_KEY) || "1200";
  @observable online = navigator.onLine;
  @observable useFrames = lsGet(FRAMES_LS_KEY) || false;
  @observable showExperimental = false;
  @observable showMoreOptions = false;
  @observable selection: (BaseNode & { data?: { [key: string]: any } })[] = [];

  @observable errorMessage = "";

  @computed get component() {
    if (!this.selection.length) {
      return invalidComponentOption;
    }
    const first = this.selection[0].data;
    if (
      !(first && first.component && componentTypes.includes(first.component))
    ) {
      return invalidComponentOption;
    }
    let value = first && first.component;
    for (const item of this.selection.slice(1)) {
      const itemValue = item && item.data && item.data.component;
      if (itemValue !== value) {
        return invalidComponentOption;
      }
    }
    return value;
  }

  set component(component: Component | typeof invalidComponentOption) {
    for (const node of this.selection) {
      if (!node.data) {
        node.data = {};
      }
      node.data.component = component;
    }
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

  componentDidMount() {
    // TODO: destroy on component unmount
    this.safeReaction(() => this.urlValue, () => (this.errorMessage = ""));
    this.selectAllUrlInputText();

    this.safeListenToEvent(window, "offline", () => (this.online = false));
    this.safeListenToEvent(window, "online", () => (this.online = true));

    this.safeListenToEvent(window, "message", e => {
      const data = (e as MessageEvent).data.pluginMessage;
      if (!data) {
        return;
      }
      if (data.type === "selectionChange") {
        this.selection = data.elements;
      }
    });

    this.safeReaction(
      () => `${this.showMoreOptions}:${this.showExperimental}`,
      () => {
        let height = settings.ui.baseHeight;
        if (this.showMoreOptions) {
          height += 50;
        }
        if (this.showExperimental) {
          height += 200;
        }
        parent.postMessage(
          {
            pluginMessage: {
              type: "resize",
              width: settings.ui.baseWidth,
              height
            }
          },
          "*"
        );
      },
      { fireImmediately: false }
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

      const apiRoot =
        process.env.API_ROOT && process.env.NODE_ENV !== "production"
          ? process.env.API_ROOT
          : "https://builder.io";

      const encocedUrl = encodeURIComponent(this.urlValue);

      lsSet(FRAMES_LS_KEY, this.useFrames);

      fetch(
        `${apiRoot}/api/v1/url-to-figma?url=${encocedUrl}&width=${width}&useFrames=${
          this.useFrames
        }`
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
          // setTimeout(() => {
          //   this.loading = false;
          // }, 50);
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
              <div
                style={{
                  position: "absolute",
                  right: -8,
                  top: 11,
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  borderRadius: 100
                }}
              >
                <Tooltip placement="left" title="More options" enterDelay={1000}>
                  <IconButton
                    style={{
                      padding: 5,
                      color: "#bbb"
                    }}
                    onClick={() =>
                      (this.showMoreOptions = !this.showMoreOptions)
                    }
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
              </div>
            </div>
            {this.showMoreOptions && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  marginTop: 15
                }}
              >
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
                          top: -9
                        }}
                      >
                        Frames
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
              <Loading style={{ marginTop: 20 }} />
              <Typography
                variant="caption"
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  color: themeVars.colors.primary,
                  fontStyle: "italic"
                }}
              >
                Crunching code... this can take a minute or two...
              </Typography>
              {/* <LinearProgress
                variant="query"
                style={{ marginTop: 20, width: "100%" }}
              /> */}
            </>
          ) : (
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
          )}
          {/* {!this.loading && (
            <Button
              size="small"
              style={{
                opacity: 0.4,
                marginTop: 10,
                marginBottom: -20,
                fontSize: 10,
                fontWeight: 400
              }}
              fullWidth
              onClick={() => (this.showMoreOptions = !this.showMoreOptions)}
            >
              {this.showMoreOptions ? "less" : "more"} options
            </Button>
          )} */}
        </form>

        <div style={{ marginTop: 20, textAlign: "center", color: "#666" }}>
          Made with ❤️ by{" "}
          <a
            style={{ color: themeVars.colors.primary }}
            href="https://builder.io"
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
              color: this.showExperimental ? themeVars.colors.primary : "#999",
              textDecoration: "none",
              marginLeft: 5,
              cursor: "pointer"
            }}
            onClick={() => (this.showExperimental = !this.showExperimental)}
          >
            Labs
          </a>
        </div>
        {this.showExperimental && (
          <div
            style={{
              marginTop: 20
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
                Experiments
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
                          style={{ textTransform: "capitalize", fontSize: 12 }}
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
                      const value = e.target.value;
                      if (componentTypes.includes(value as Component)) {
                        this.component = value as Component;
                      }
                    }}
                  >
                    {(componentTypes as string[])
                      .concat([invalidComponentOption])
                      .map(item => (
                        <MenuItem
                          style={{
                            fontSize: 12,
                            textTransform: "capitalize",
                            opacity: item === invalidComponentOption ? 0.5 : 1
                          }}
                          key={item}
                          value={item}
                        >
                          {item}
                        </MenuItem>
                      ))}
                  </TextField>

                  <Tooltip
                    PopperProps={{
                      modifiers: {
                        preventOverflow: {
                          boundariesElement: document.body
                        }
                      }
                    }}
                    title="Export to Builder to convert this page into code - coming soon!"
                  >
                    <span>
                      {/* TODO: check validitiy and prompt, select all elements not valid */}
                      <Button
                        style={{ marginTop: 15, fontWeight: 400 }}
                        disabled
                        size="small"
                        fullWidth
                        color="primary"
                        variant="outlined"
                        onClick={() => {
                          // TODO: analyze if page is properly nested and annotated, if not
                          // suggest in the UI what needs grouping
                        }}
                      >
                        Export to Builder
                      </Button>
                    </span>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        )}
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
