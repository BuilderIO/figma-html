# Builder.io for Figma: AI generation, export to code, import from web

<p align="center">
  <img alt="Figma to HTML title" src="https://cdn.builder.io/api/v1/image/assets%2FYJIGb4i01jvw0SRdL5Bt%2Feafd8e1b9b904e56bfb21aac5b357820" />
</p>

<p align="center">
  Teach Figma how to speak code: generate designs via AI, convert designs to code, import from web.
</p>

## How does it work

### Generate designs via AI

1. [Install the plugin](https://www.figma.com/c/plugin/747985167520967365/HTML-To-Figma)
2. Create an [OpenAI account](https://platform.openai.com/signup), grab your [OpenAI key](https://platform.openai.com/account/api-keys), make sure you have [billing enabled](https://platform.openai.com/account/billing/overview), and add your API key in the plugin
3. Enter a prompt, and watch AI design in real time!

Troubleshooting: if having trouble with your OpenAI API calls, please follow [this guide](https://help.openai.com/en/articles/6891831-error-code-429-you-exceeded-your-current-quota-please-check-your-plan-and-billing-details)

### Export designs to code

1. [Install the plugin](https://www.figma.com/c/plugin/747985167520967365/HTML-To-Figma)
2. Ensure all layers you want to import use autolayout as described [here](https://www.builder.io/c/docs/import-from-figma)
3. Click the "get code" button to launch into the [Builder.io](https://www.builder.io) editor
4. Make any final adjustments, and click "get code" at the top of Builder to view code output, or copy and paste it to content of a Builder account to publish live

### Import webpages to Figma designs

1. [Install the plugin](https://www.figma.com/c/plugin/747985167520967365/HTML-To-Figma)
2. In Figma, open a new or existing document, then hit cmd+/ and search "html figma" and hit enter
3. Enter a URL you want to import

## Why?

- Instantly convert designs into live webpages and code
- Easily import real live site styles for a starting point for designs and prototypes
- Quickly turn real site components into design components
- Easy import from storybook, etc

## Chrome Extension

Want to capture a page behind an auth wall, or in a specific state you need to navigate to? Then the [chrome extension](https://chrome.google.com/webstore/detail/efjcmgblfpkhbjpkpopkgeomfkokpaim) is for you!

## Using the library

```js
// npm install @builder.io/html-to-figma
import { htmlToFigma } from "@builder.io/html-to-figma";
const layers = htmlToFigma(document.body);
// E.g. send these to the REST API, or generate a .figma.json file that can be uploaded through the Figma plugin
```

## Auto-layout Vectors

When exporting Figma to Builder, the plugin requires all elements to be in auto-layout. However, it's not possible to auto-layout a vector. The alternative here is to use Figma's `rasterize selection` command on your vector. If the output of that is too low-resolution, then you can try this plugin: https://www.figma.com/community/plugin/837846252158418235/Flatten-Selection-to-Bitmap.

If you want the Builder end-result to have a vector, then consider this rasterized selection as a placeholder, and swap it back with an SVG in the Builder editor.

## Limitations

Importing HTML layers to Figma is a best-effort process. Even getting 90% there can save you a ton of time, only having to clean up a few things.

A few known limitations:

- not all element types are supported (e.g. iframe, pseudoelements)
- not all CSS properties are supported or fully supported
- not all types of media are supported (video, animated gifs, etc)
- all fonts have to be uploaded to Figma or a best effort fallback will be used

If you find any issues or have feedback at all please [make an issue](https://github.com/BuilderIO/html-to-figma/issues/new)

## Architecture

- `builder.io/api/v1/html-to-figma`: API endpoint that converts a URL's layout to a Figma design. The logic of that endpoint lives in this repo, under [./lib/html-to-figma](./lib/html-to-figma).
- `builder.io/api/v1/figma-to-builder`: API endpoint that converts a Figma design to a Builder content JSON. The logic of that endpoint lives in Builder's API.

## DEVELOP

Read [DEVELOP.md](./DEVELOP.md)

<p align="center">
   <a href="https://www.builder.io/m/developers">
      <picture>
         <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/844291/230786554-eb225eeb-2f6b-4286-b8c2-535b1131744a.png">
         <img width="250" alt="Made with love by Builder.io" src="https://user-images.githubusercontent.com/844291/230786555-a58479e4-75f3-4222-a6eb-74c5af953eac.png">
       </picture>
   </a>
</p>
