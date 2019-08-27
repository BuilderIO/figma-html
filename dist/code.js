/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/code.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/code.ts":
/*!*********************!*\
  !*** ./src/code.ts ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// This plugin will open a modal to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser enviroment (see documentation).
// This shows the HTML page in "ui.html".
figma.showUI(__html__, {
    width: 500,
    height: 300
});
function processImages(layer) {
    return __awaiter(this, void 0, void 0, function* () {
        const images = getImageFills(layer);
        return (images &&
            Promise.all(images.map((image) => __awaiter(this, void 0, void 0, function* () {
                if (image && image.intArr) {
                    image.imageHash = yield figma.createImage(image.intArr).hash;
                    delete image.intArr;
                }
            }))));
    });
}
function getImageFills(layer) {
    const images = Array.isArray(layer.fills) &&
        layer.fills.filter(item => item.type === "IMAGE");
    return images;
}
const normalizeName = (str) => str.toLowerCase().replace(/[^a-z]/gi, "");
const defaultFont = { family: "Roboto", style: "Regular" };
// TODO: keep list of fonts not found
function getMatchingFont(fontStr, availableFonts) {
    return __awaiter(this, void 0, void 0, function* () {
        const familySplit = fontStr.split(/\s*,\s*/);
        for (const family of familySplit) {
            const normalized = normalizeName(family);
            for (const availableFont of availableFonts) {
                const normalizedAvailable = normalizeName(availableFont.fontName.family);
                if (normalizedAvailable === normalized) {
                    const cached = fontCache[normalizedAvailable];
                    if (cached) {
                        return cached;
                    }
                    yield figma.loadFontAsync(availableFont.fontName);
                    fontCache[fontStr] = availableFont.fontName;
                    fontCache[normalizedAvailable] = availableFont.fontName;
                    return availableFont.fontName;
                }
            }
        }
        return defaultFont;
    });
}
const fontCache = {};
// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (msg) => __awaiter(this, void 0, void 0, function* () {
    function assign(a, b) {
        for (const key in b) {
            const value = b[key];
            if (value && ["width", "height", "type"].indexOf(key) === -1) {
                a[key] = b[key];
            }
        }
    }
    if (msg.type === "import") {
        const availableFonts = (yield figma.listAvailableFontsAsync()).filter(font => font.fontName.style === "Regular");
        yield figma.loadFontAsync(defaultFont);
        const { data } = msg;
        const { layers } = data;
        const rects = [];
        let baseFrame = figma.currentPage;
        for (const layer of layers) {
            try {
                if (layer.type === "FRAME") {
                    const frame = figma.createFrame();
                    frame.x = layer.x;
                    frame.y = layer.y;
                    frame.resize(layer.width, layer.height);
                    rects.push(frame);
                    baseFrame.appendChild(frame);
                    baseFrame = frame;
                }
                else if (layer.type === "SVG") {
                    const node = figma.createNodeFromSvg(layer.svg);
                    node.x = layer.x;
                    node.y = layer.y;
                    node.resize(layer.width, layer.height);
                    rects.push(node);
                    baseFrame.appendChild(node);
                }
                else if (layer.type === "RECTANGLE") {
                    const rect = figma.createRectangle();
                    if (getImageFills(layer)) {
                        yield processImages(layer);
                    }
                    assign(rect, layer);
                    rect.resize(layer.width, layer.height);
                    rects.push(rect);
                    baseFrame.appendChild(rect);
                }
                else if (layer.type == "TEXT") {
                    const text = figma.createText();
                    if (layer.fontFamily) {
                        const cached = fontCache[layer.fontFamily];
                        if (cached) {
                            text.fontName = cached;
                        }
                        else {
                            const family = yield getMatchingFont(layer.fontFamily || "", availableFonts);
                            text.fontName = family;
                        }
                        delete layer.fontFamily;
                    }
                    assign(text, layer);
                    text.resize(layer.width, layer.height);
                    text.textAutoResize = "HEIGHT";
                    const lineHeight = (layer.lineHeight && layer.lineHeight.value) || layer.height;
                    let adjustments = 0;
                    while (typeof text.fontSize === "number" &&
                        typeof layer.fontSize === "number" &&
                        (text.height > Math.max(layer.height, lineHeight) * 1.2 ||
                            text.width > layer.width * 1.2)) {
                        // Don't allow changing more than ~30%
                        if (adjustments++ > layer.fontSize * 0.3) {
                            console.warn("Too many font adjustments", text, layer);
                            // debugger
                            break;
                        }
                        try {
                            text.fontSize = text.fontSize - 1;
                        }
                        catch (err) {
                            console.warn("Error on resize text:", layer, text, err);
                        }
                    }
                    rects.push(text);
                    baseFrame.appendChild(text);
                }
            }
            catch (err) {
                console.warn("Error on layer:", layer, err);
            }
        }
        figma.viewport.scrollAndZoomIntoView([baseFrame]);
    }
    // Make sure to close the plugin when you're done. Otherwise the plugin will
    // keep running, which shows the cancel button at the bottom of the screen.
    figma.closePlugin();
});


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vc3JjL2NvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtRQUFBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBOzs7UUFHQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0EsMENBQTBDLGdDQUFnQztRQUMxRTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLHdEQUF3RCxrQkFBa0I7UUFDMUU7UUFDQSxpREFBaUQsY0FBYztRQUMvRDs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0EseUNBQXlDLGlDQUFpQztRQUMxRSxnSEFBZ0gsbUJBQW1CLEVBQUU7UUFDckk7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSwyQkFBMkIsMEJBQTBCLEVBQUU7UUFDdkQsaUNBQWlDLGVBQWU7UUFDaEQ7UUFDQTtRQUNBOztRQUVBO1FBQ0Esc0RBQXNELCtEQUErRDs7UUFFckg7UUFDQTs7O1FBR0E7UUFDQTs7Ozs7Ozs7Ozs7OztBQ2xGYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUNBQW1DLE1BQU0sNkJBQTZCLEVBQUUsWUFBWSxXQUFXLEVBQUU7QUFDakcsa0NBQWtDLE1BQU0saUNBQWlDLEVBQUUsWUFBWSxXQUFXLEVBQUU7QUFDcEcsK0JBQStCLGlFQUFpRSx1QkFBdUIsRUFBRSw0QkFBNEI7QUFDcko7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZUFBZSxPQUFPO0FBQ3RCLGVBQWUsU0FBUztBQUN4QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUMiLCJmaWxlIjoiY29kZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGdldHRlciB9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gZnVuY3Rpb24oZXhwb3J0cykge1xuIFx0XHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcbiBcdFx0fVxuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuIFx0fTtcblxuIFx0Ly8gY3JlYXRlIGEgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0XG4gXHQvLyBtb2RlICYgMTogdmFsdWUgaXMgYSBtb2R1bGUgaWQsIHJlcXVpcmUgaXRcbiBcdC8vIG1vZGUgJiAyOiBtZXJnZSBhbGwgcHJvcGVydGllcyBvZiB2YWx1ZSBpbnRvIHRoZSBuc1xuIFx0Ly8gbW9kZSAmIDQ6IHJldHVybiB2YWx1ZSB3aGVuIGFscmVhZHkgbnMgb2JqZWN0XG4gXHQvLyBtb2RlICYgOHwxOiBiZWhhdmUgbGlrZSByZXF1aXJlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnQgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZSkge1xuIFx0XHRpZihtb2RlICYgMSkgdmFsdWUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKHZhbHVlKTtcbiBcdFx0aWYobW9kZSAmIDgpIHJldHVybiB2YWx1ZTtcbiBcdFx0aWYoKG1vZGUgJiA0KSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICYmIHZhbHVlLl9fZXNNb2R1bGUpIHJldHVybiB2YWx1ZTtcbiBcdFx0dmFyIG5zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yKG5zKTtcbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5zLCAnZGVmYXVsdCcsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHZhbHVlIH0pO1xuIFx0XHRpZihtb2RlICYgMiAmJiB0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIGZvcih2YXIga2V5IGluIHZhbHVlKSBfX3dlYnBhY2tfcmVxdWlyZV9fLmQobnMsIGtleSwgZnVuY3Rpb24oa2V5KSB7IHJldHVybiB2YWx1ZVtrZXldOyB9LmJpbmQobnVsbCwga2V5KSk7XG4gXHRcdHJldHVybiBucztcbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSBcIi4vc3JjL2NvZGUudHNcIik7XG4iLCJcInVzZSBzdHJpY3RcIjtcbi8vIFRoaXMgcGx1Z2luIHdpbGwgb3BlbiBhIG1vZGFsIHRvIHByb21wdCB0aGUgdXNlciB0byBlbnRlciBhIG51bWJlciwgYW5kXG4vLyBpdCB3aWxsIHRoZW4gY3JlYXRlIHRoYXQgbWFueSByZWN0YW5nbGVzIG9uIHRoZSBzY3JlZW4uXG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHJlc3VsdC52YWx1ZSk7IH0pLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbi8vIFRoaXMgZmlsZSBob2xkcyB0aGUgbWFpbiBjb2RlIGZvciB0aGUgcGx1Z2lucy4gSXQgaGFzIGFjY2VzcyB0byB0aGUgKmRvY3VtZW50Ki5cbi8vIFlvdSBjYW4gYWNjZXNzIGJyb3dzZXIgQVBJcyBpbiB0aGUgPHNjcmlwdD4gdGFnIGluc2lkZSBcInVpLmh0bWxcIiB3aGljaCBoYXMgYVxuLy8gZnVsbCBicm93c2VyIGVudmlyb21lbnQgKHNlZSBkb2N1bWVudGF0aW9uKS5cbi8vIFRoaXMgc2hvd3MgdGhlIEhUTUwgcGFnZSBpbiBcInVpLmh0bWxcIi5cbmZpZ21hLnNob3dVSShfX2h0bWxfXywge1xuICAgIHdpZHRoOiA1MDAsXG4gICAgaGVpZ2h0OiAzMDBcbn0pO1xuZnVuY3Rpb24gcHJvY2Vzc0ltYWdlcyhsYXllcikge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGNvbnN0IGltYWdlcyA9IGdldEltYWdlRmlsbHMobGF5ZXIpO1xuICAgICAgICByZXR1cm4gKGltYWdlcyAmJlxuICAgICAgICAgICAgUHJvbWlzZS5hbGwoaW1hZ2VzLm1hcCgoaW1hZ2UpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW1hZ2UgJiYgaW1hZ2UuaW50QXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGltYWdlLmltYWdlSGFzaCA9IHlpZWxkIGZpZ21hLmNyZWF0ZUltYWdlKGltYWdlLmludEFycikuaGFzaDtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGltYWdlLmludEFycjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSkpKTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGdldEltYWdlRmlsbHMobGF5ZXIpIHtcbiAgICBjb25zdCBpbWFnZXMgPSBBcnJheS5pc0FycmF5KGxheWVyLmZpbGxzKSAmJlxuICAgICAgICBsYXllci5maWxscy5maWx0ZXIoaXRlbSA9PiBpdGVtLnR5cGUgPT09IFwiSU1BR0VcIik7XG4gICAgcmV0dXJuIGltYWdlcztcbn1cbmNvbnN0IG5vcm1hbGl6ZU5hbWUgPSAoc3RyKSA9PiBzdHIudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtel0vZ2ksIFwiXCIpO1xuY29uc3QgZGVmYXVsdEZvbnQgPSB7IGZhbWlseTogXCJSb2JvdG9cIiwgc3R5bGU6IFwiUmVndWxhclwiIH07XG4vLyBUT0RPOiBrZWVwIGxpc3Qgb2YgZm9udHMgbm90IGZvdW5kXG5mdW5jdGlvbiBnZXRNYXRjaGluZ0ZvbnQoZm9udFN0ciwgYXZhaWxhYmxlRm9udHMpIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBjb25zdCBmYW1pbHlTcGxpdCA9IGZvbnRTdHIuc3BsaXQoL1xccyosXFxzKi8pO1xuICAgICAgICBmb3IgKGNvbnN0IGZhbWlseSBvZiBmYW1pbHlTcGxpdCkge1xuICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZU5hbWUoZmFtaWx5KTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYXZhaWxhYmxlRm9udCBvZiBhdmFpbGFibGVGb250cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRBdmFpbGFibGUgPSBub3JtYWxpemVOYW1lKGF2YWlsYWJsZUZvbnQuZm9udE5hbWUuZmFtaWx5KTtcbiAgICAgICAgICAgICAgICBpZiAobm9ybWFsaXplZEF2YWlsYWJsZSA9PT0gbm9ybWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYWNoZWQgPSBmb250Q2FjaGVbbm9ybWFsaXplZEF2YWlsYWJsZV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYWNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgeWllbGQgZmlnbWEubG9hZEZvbnRBc3luYyhhdmFpbGFibGVGb250LmZvbnROYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgZm9udENhY2hlW2ZvbnRTdHJdID0gYXZhaWxhYmxlRm9udC5mb250TmFtZTtcbiAgICAgICAgICAgICAgICAgICAgZm9udENhY2hlW25vcm1hbGl6ZWRBdmFpbGFibGVdID0gYXZhaWxhYmxlRm9udC5mb250TmFtZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF2YWlsYWJsZUZvbnQuZm9udE5hbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZhdWx0Rm9udDtcbiAgICB9KTtcbn1cbmNvbnN0IGZvbnRDYWNoZSA9IHt9O1xuLy8gQ2FsbHMgdG8gXCJwYXJlbnQucG9zdE1lc3NhZ2VcIiBmcm9tIHdpdGhpbiB0aGUgSFRNTCBwYWdlIHdpbGwgdHJpZ2dlciB0aGlzXG4vLyBjYWxsYmFjay4gVGhlIGNhbGxiYWNrIHdpbGwgYmUgcGFzc2VkIHRoZSBcInBsdWdpbk1lc3NhZ2VcIiBwcm9wZXJ0eSBvZiB0aGVcbi8vIHBvc3RlZCBtZXNzYWdlLlxuZmlnbWEudWkub25tZXNzYWdlID0gKG1zZykgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgIGZ1bmN0aW9uIGFzc2lnbihhLCBiKSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGIpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYltrZXldO1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmIFtcIndpZHRoXCIsIFwiaGVpZ2h0XCIsIFwidHlwZVwiXS5pbmRleE9mKGtleSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgYVtrZXldID0gYltrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChtc2cudHlwZSA9PT0gXCJpbXBvcnRcIikge1xuICAgICAgICBjb25zdCBhdmFpbGFibGVGb250cyA9ICh5aWVsZCBmaWdtYS5saXN0QXZhaWxhYmxlRm9udHNBc3luYygpKS5maWx0ZXIoZm9udCA9PiBmb250LmZvbnROYW1lLnN0eWxlID09PSBcIlJlZ3VsYXJcIik7XG4gICAgICAgIHlpZWxkIGZpZ21hLmxvYWRGb250QXN5bmMoZGVmYXVsdEZvbnQpO1xuICAgICAgICBjb25zdCB7IGRhdGEgfSA9IG1zZztcbiAgICAgICAgY29uc3QgeyBsYXllcnMgfSA9IGRhdGE7XG4gICAgICAgIGNvbnN0IHJlY3RzID0gW107XG4gICAgICAgIGxldCBiYXNlRnJhbWUgPSBmaWdtYS5jdXJyZW50UGFnZTtcbiAgICAgICAgZm9yIChjb25zdCBsYXllciBvZiBsYXllcnMpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyLnR5cGUgPT09IFwiRlJBTUVcIikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmcmFtZSA9IGZpZ21hLmNyZWF0ZUZyYW1lKCk7XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lLnggPSBsYXllci54O1xuICAgICAgICAgICAgICAgICAgICBmcmFtZS55ID0gbGF5ZXIueTtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWUucmVzaXplKGxheWVyLndpZHRoLCBsYXllci5oZWlnaHQpO1xuICAgICAgICAgICAgICAgICAgICByZWN0cy5wdXNoKGZyYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgYmFzZUZyYW1lLmFwcGVuZENoaWxkKGZyYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgYmFzZUZyYW1lID0gZnJhbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxheWVyLnR5cGUgPT09IFwiU1ZHXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGZpZ21hLmNyZWF0ZU5vZGVGcm9tU3ZnKGxheWVyLnN2Zyk7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUueCA9IGxheWVyLng7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUueSA9IGxheWVyLnk7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUucmVzaXplKGxheWVyLndpZHRoLCBsYXllci5oZWlnaHQpO1xuICAgICAgICAgICAgICAgICAgICByZWN0cy5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBiYXNlRnJhbWUuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxheWVyLnR5cGUgPT09IFwiUkVDVEFOR0xFXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IGZpZ21hLmNyZWF0ZVJlY3RhbmdsZSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ2V0SW1hZ2VGaWxscyhsYXllcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIHByb2Nlc3NJbWFnZXMobGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFzc2lnbihyZWN0LCBsYXllcik7XG4gICAgICAgICAgICAgICAgICAgIHJlY3QucmVzaXplKGxheWVyLndpZHRoLCBsYXllci5oZWlnaHQpO1xuICAgICAgICAgICAgICAgICAgICByZWN0cy5wdXNoKHJlY3QpO1xuICAgICAgICAgICAgICAgICAgICBiYXNlRnJhbWUuYXBwZW5kQ2hpbGQocmVjdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxheWVyLnR5cGUgPT0gXCJURVhUXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGZpZ21hLmNyZWF0ZVRleHQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxheWVyLmZvbnRGYW1pbHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlZCA9IGZvbnRDYWNoZVtsYXllci5mb250RmFtaWx5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYWNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0LmZvbnROYW1lID0gY2FjaGVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmFtaWx5ID0geWllbGQgZ2V0TWF0Y2hpbmdGb250KGxheWVyLmZvbnRGYW1pbHkgfHwgXCJcIiwgYXZhaWxhYmxlRm9udHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQuZm9udE5hbWUgPSBmYW1pbHk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgbGF5ZXIuZm9udEZhbWlseTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhc3NpZ24odGV4dCwgbGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICB0ZXh0LnJlc2l6ZShsYXllci53aWR0aCwgbGF5ZXIuaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICAgICAgdGV4dC50ZXh0QXV0b1Jlc2l6ZSA9IFwiSEVJR0hUXCI7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpbmVIZWlnaHQgPSAobGF5ZXIubGluZUhlaWdodCAmJiBsYXllci5saW5lSGVpZ2h0LnZhbHVlKSB8fCBsYXllci5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGxldCBhZGp1c3RtZW50cyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICh0eXBlb2YgdGV4dC5mb250U2l6ZSA9PT0gXCJudW1iZXJcIiAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGxheWVyLmZvbnRTaXplID09PSBcIm51bWJlclwiICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAodGV4dC5oZWlnaHQgPiBNYXRoLm1heChsYXllci5oZWlnaHQsIGxpbmVIZWlnaHQpICogMS4yIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dC53aWR0aCA+IGxheWVyLndpZHRoICogMS4yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG9uJ3QgYWxsb3cgY2hhbmdpbmcgbW9yZSB0aGFuIH4zMCVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhZGp1c3RtZW50cysrID4gbGF5ZXIuZm9udFNpemUgKiAwLjMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJUb28gbWFueSBmb250IGFkanVzdG1lbnRzXCIsIHRleHQsIGxheWVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkZWJ1Z2dlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0LmZvbnRTaXplID0gdGV4dC5mb250U2l6ZSAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRXJyb3Igb24gcmVzaXplIHRleHQ6XCIsIGxheWVyLCB0ZXh0LCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlY3RzLnB1c2godGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGJhc2VGcmFtZS5hcHBlbmRDaGlsZCh0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRXJyb3Igb24gbGF5ZXI6XCIsIGxheWVyLCBlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZpZ21hLnZpZXdwb3J0LnNjcm9sbEFuZFpvb21JbnRvVmlldyhbYmFzZUZyYW1lXSk7XG4gICAgfVxuICAgIC8vIE1ha2Ugc3VyZSB0byBjbG9zZSB0aGUgcGx1Z2luIHdoZW4geW91J3JlIGRvbmUuIE90aGVyd2lzZSB0aGUgcGx1Z2luIHdpbGxcbiAgICAvLyBrZWVwIHJ1bm5pbmcsIHdoaWNoIHNob3dzIHRoZSBjYW5jZWwgYnV0dG9uIGF0IHRoZSBib3R0b20gb2YgdGhlIHNjcmVlbi5cbiAgICBmaWdtYS5jbG9zZVBsdWdpbigpO1xufSk7XG4iXSwic291cmNlUm9vdCI6IiJ9