<p align="center">
  <img alt="Html to figma" src="https://imgur.com/FrlJOr4.jpg" />
</p>

<br />

# HTML <-> Figma

Figma plugin to convert HTML from a URL to Figma, or convert Figma designs to code via [JSX Lite](https://github.com/BuilderIO/jsx-lite)

## How does it work

1. [Install the plugin](https://www.figma.com/c/plugin/747985167520967365/HTML-To-Figma)
1. In Figma, open a new or existing document, then hit cmd+/ and search "html to figma" and hit enter
1. Enter a URL you want to import

<img src="https://i.imgur.com/YNDD9dH.gif" alt="Plugin demo" width="480" />


## Why?

- Easily import real live site styles for a starting point for designs and prototypes
- Quickly turn real site components into design components
- Easy import from storybook, etc

## Chrome Extension

Want to capture a page behind an auth wall, or in a specific state you need to navigate to? Then the [chrome extension](https://chrome.google.com/webstore/detail/efjcmgblfpkhbjpkpopkgeomfkokpaim) is for you!

<img src="https://imgur.com/ARz16KC.gif" alt="Chrome extension demo" width="480" />


## Using the library

```js
// npm install @builder.io/html-to-figma
import { htmlToFigma } from '@builder.io/html-to-figma';
const layers = htmlToFigma(document.body)
// E.g. send these to the REST API, or generate a .figma.json file that can be uploaded through the Figma plugin
```

## Limitations

Importing HTML layers to Figma is a best-effort process. Even getting 90% there can save you a ton of time, only having to clean up a few things.

A few known limitations:

- not all element types are supported (e.g. iframe, pseudoelements)
- not all CSS properties are supported or fully supported
- not all types of media are supported (video, animated gifs, etc)
- all fonts have to be uploaded to Figma or a best effort fallback will be used

If you find any issues or have feedback at all please [make an issue](https://github.com/BuilderIO/html-to-figma/issues/new)


## TODO
- Support code import and export via [JSX Lite](https://github.com/BuilderIO/jsx-lite)
- Support Figma components

<br />
<p align="center">
  Made with ❤️ by <a target="_blank" href="https://builder.io/">Builder.io</a>
</p>
