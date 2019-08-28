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
  Typography
} from "@material-ui/core";
import green from "@material-ui/core/colors/green";
import { theme as themeVars } from "./constants/theme";
import "./ui.css";
import { SafeComponent } from "./classes/safe-component";
import Loading from "./components/loading";
import { traverseLayers } from "./functions/traverse-layers";

declare var process: {
  env: {
    NODE_ENV: "production" | "development" | undefined;
    API_ROOT: string | undefined;
  };
};

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

@observer
class App extends SafeComponent {
  @observable loading = false;
  @observable urlValue = "https://builder.io";
  @observable width = "1200";
  @observable online = navigator.onLine;

  @observable errorMessage = "";

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
  }

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

      const apiRoot =
        process.env.API_ROOT && process.env.NODE_ENV !== "production"
          ? process.env.API_ROOT
          : "https://builder.io";

      const encocedUrl = encodeURIComponent(this.urlValue);

      fetch(`${apiRoot}/api/v1/url-to-figma?url=${encocedUrl}&width=${width}`)
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
      <div style={{ display: "flex", flexDirection: "column", padding: 20 }}>
        <Typography style={{ textAlign: "center", marginTop: 0 }} variant="h6">
          Import from URL
        </Typography>

        <form
          ref={ref => (this.form = ref)}
          // {...{ validate: 'true' }}
          style={{ display: "flex", flexDirection: "column" }}
          onSubmit={e => {
            e.preventDefault();
            this.onCreate();
          }}
        >
          <div style={{ display: "flex", marginTop: 20 }}>
            <TextField
              label="URL"
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
            <TextField
              label="Width"
              required
              inputProps={{
                min: "200",
                max: "3000",
                step: "10"
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
              style={{ marginLeft: 20, width: 100 }}
              type="number"
              value={this.width}
              onChange={e => {
                this.width = String(parseInt(e.target.value) || 1200);
              }}
            />
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
