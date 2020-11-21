# HTML <> Figma Chrome Extension

> Chrome extension to import the current page HTML to Figma

## Usage

1) Install the Then the [chrome extension](https://chrome.google.com/webstore/detail/efjcmgblfpkhbjpkpopkgeomfkokpaim)

2) Go to a page, click the extension icon, and choose "capture current page"

3) Open figma and be sure you have the [figma plugin](https://www.figma.com/c/plugin/747985167520967365/HTML-To-Figma) installed

4) Hit command + / and type "html figma" and hit enter

5) Choose "upload here" and upload the file downloaded by the extension

<img src="https://imgur.com/ARz16KC.gif" alt="Chrome extension demo" width="480" />

## Building

1.  Clone repo
2.  `cd chrome-extension`
3.  `npm install`
4.  `npm run dev` to compile once or `npm run watch` to run the dev task in watch mode
5.  `npm run build` to build a production (minified) version

## Dev Installation

1.  Complete the steps to build the project above
2.  Go to [_chrome://extensions_](chrome://extensions) in Google Chrome
3.  With the developer mode checkbox ticked, click **Load unpacked extension...** and select the _dist_ folder from this repo
