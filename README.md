# HTML To Figma

Figma plugin to convert HTML from a URL to Figma

<p align="center">
  <img alt="Html to figma" src="https://i.imgur.com/sn1rmXk.jpg" height="261" />
</p>


## How does it work

1) Open the plugin with cmd+/ and search "html to figma" and hit enter
2) Enter a URL you want to import
3) Profit

<img src="https://i.imgur.com/0jycGDC.gif" alt="Demo" />

## Why?

- Easily import real live site styles for a starting point for m
- Quicly turn real site components into design components
- Easy import from storybook, etc


## Limitations

Importing HTML layers to Figma is a best-effort process. Even getting 90% there can save you a ton of time, only having to clean up a few things. A few known limitations

- pseudoelements are not supported
- some CSS properties (e.g. overflow) are not supported or not fully supported
- not all types of images are supported (animated gifs, webp)
- resizing information is not generated
- all fonts have to be uploaded to Figma or a best effort fallback will be used

If you find any issues or have feedback at all please [make an issue](https://github.com/BuilderIO/html-to-figma/issues/new)
