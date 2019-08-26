import * as React from "react";
import * as ReactDOM from "react-dom";
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import "./ui.css";

declare function require(path: string): any;

type Node = TextNode | RectangleNode;

function getImageFill(layer: Node) {
  const image =
    Array.isArray(layer.fills) &&
    layer.fills.find(item => item.type === "IMAGE");
  return image;
}

function processImages(layer: Node) {
  const image = getImageFill(layer);
  if (image) {
    const url = image.url;
    if (url.startsWith("data:")) {
      // const type = url.split(/[:,]/)[1];
      // const buffer = new Buffer(url.split(',')[1], )
      return Promise.resolve();
    }
    return fetch(
      "https://builder.io/api/v1/proxy-api?url=" + encodeURIComponent(url)
    )
      .then(res => res.arrayBuffer())
      .then(buffer => {
        const intArr = new Uint8Array(buffer);
        delete image.url;
        image.intArr = intArr;
      });
  }
  return Promise.resolve();
}

class App extends React.Component {
  textbox: HTMLInputElement;

  @observable loading = false;

  countRef = (element: HTMLInputElement) => {
    if (element) element.value = "5";
    this.textbox = element;
  };

  onCreate = () => {
    const textbox = document.getElementById("url");
    loading.style.display = "block";
    if (textbox.value) {
      fetch(
        "https://042ddc79.ngrok.io/api/v1/url-to-figma?url=" +
          encodeURIComponent(textbox.value)
      )
        .then(res => res.json())
        .then(data => {
          console.log("data", data);
          const layers = data.layers;
          return Promise.all(
            [data].concat(
              layers.map(layer => {
                if (getImageFill(layer)) {
                  return processImages(layer).catch(err => {
                    console.warn("Could not process image", err);
                  });
                }
              })
            )
          );
        })
        .then(data => {
          loading.style.display = "none";
          parent.postMessage(
            { pluginMessage: { type: "import", data: data[0] } },
            "*"
          );
        })
        .catch(err => {
          loading.style.display = "none";
          console.error(err);
          alert(err);
        });
    }
  };

  onCancel = () => {
    parent.postMessage({ pluginMessage: { type: "cancel" } }, "*");
  };

  render() {
    return (
      <div>
        <h2>Import from URL</h2>

        <p>
          URL: <input id="url" value="https://builder.io" />
        </p>
        <div style="display: none" id="loading">
          Loading...
        </div>
        <button id="create">Import</button>
        <button id="cancel">Cancel</button>

        <div style="margin-top: 10px; text-align: center">
          Made with ❤️ by{" "}
          <a href="https://builder.io" target="_blank">
            Builder.io
          </a>
        </div>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("react-page"));
