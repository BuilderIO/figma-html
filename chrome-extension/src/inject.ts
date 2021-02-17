import { htmlToFigma } from "@builder.io/html-to-figma";

const layers = htmlToFigma('body', location.hash.includes('useFrames=true'));
var json = JSON.stringify({ layers });
var blob = new Blob([json], {
  type: "application/json"
});

const link = document.createElement("a");
link.setAttribute("href", URL.createObjectURL(blob));
link.setAttribute("download", "page.figma.json");
document.body.appendChild(link);

link.click();
document.body.removeChild(link);
