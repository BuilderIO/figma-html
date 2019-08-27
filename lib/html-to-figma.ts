export default function htmlToFigma(selector = 'body') {
  function getAppliedComputedStyles(
    element: Element,
    pseudo?: string
  ): { [key: string]: string } {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
      return {};
    }

    const styles = getComputedStyle(element, pseudo);

    const list: (keyof React.CSSProperties)[] = [
      'opacity',
      'backgroundColor',
      'border',
      'borderTop',
      'borderLeft',
      'borderRight',
      'borderBottom',
      'borderRadius',
      'backgroundImage',
      'borderColor',
      'boxShadow',
    ];

    const color = styles.color;

    const defaults: any = {
      transform: 'none',
      opacity: '1',
      borderRadius: '0px',
      backgroundImage: 'none',
      backgroundPosition: '0% 0%',
      backgroundSize: 'auto',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      backgroundAttachment: 'scroll',
      border: '0px none ' + color,
      borderTop: '0px none ' + color,
      borderBottom: '0px none ' + color,
      borderLeft: '0px none ' + color,
      borderRight: '0px none ' + color,
      borderWidth: '0px',
      borderColor: color,
      borderStyle: 'none',
      boxShadow: 'none',
      fontWeight: '400',
      textAlign: 'start',
      justifyContent: 'normal',
      alignItems: 'normal',
      alignSelf: 'auto',
      flexGrow: '0',
      textDecoration: 'none solid ' + color,
      lineHeight: 'normal',
      letterSpacing: 'normal',
      backgroundRepeat: 'repeat',
      zIndex: 'auto', // TODO
    };

    function pick<T extends { [key: string]: V }, V = any>(object: T, paths: (keyof T)[]) {
      const newObject: Partial<T> = {};
      paths.forEach(path => {
        if (object[path]) {
          if (object[path] !== defaults[path]) {
            newObject[path] = object[path];
          }
        }
      });
      return newObject;
    }

    return pick(styles, list as any) as any;
  }
  function size(obj: object) {
    return Object.keys(obj).length;
  }

  const layers: (RectangleNode | TextNode)[] = [];
  const el = document.querySelector(selector || 'body');

  function textNodesUnder(el: Element) {
    let n: Node | null = null;
    const a: Node[] = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);

    while ((n = walk.nextNode())) {
      a.push(n);
    }
    return a;
  }

  interface Unit {
    unit: 'PIXELS';
    value: number;
  }

  const parseUnits = (str?: string | null): null | Unit => {
    if (!str) {
      return null;
    }
    const match = str.match(/([\d\.]+)px/);
    const val = match && match[1];
    if (val) {
      return {
        unit: 'PIXELS',
        value: parseFloat(val),
      };
    }
    return null;
  };

  function isHidden(element: Element) {
    let el: Element | null = element;
    do {
      const computed = getComputedStyle(el);
      if (
        // computed.opacity === '0' ||
        computed.display === 'none' ||
        computed.visibility === 'hidden'
      ) {
        return true;
      }
    } while ((el = el.parentElement));
    return false;
  }

  if (el) {
    const els = el.querySelectorAll('*');

    if (els) {
      Array.from(els).forEach(el => {
        if (isHidden(el)) {
          return;
        }
        if (el instanceof SVGSVGElement) {
          const rect = el.getBoundingClientRect();

          // TODO: pull in CSS/computed styles
          // TODO: may need to pull in layer styles too like shadow, bg color, etc
          layers.push({
            type: 'SVG',
            svg: el.outerHTML,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          } as any);
          return;
        }
        // Sub SVG Eleemnt
        else if (el instanceof SVGElement) {
          return;
        }

        const appliedStyles = getAppliedComputedStyles(el);
        const computedStyle = getComputedStyle(el);

        if (
          (size(appliedStyles) ||
            el instanceof HTMLImageElement ||
            el instanceof HTMLVideoElement) &&
          computedStyle.display !== 'none'
        ) {
          console.log('appliedStyles', JSON.stringify(appliedStyles));
          const rect = el.getBoundingClientRect();

          if (rect.width >= 1 && rect.height >= 1) {
            const fills: Paint[] = [];

            const color = getRgb(computedStyle.backgroundColor);

            if (color) {
              fills.push({
                type: 'SOLID',
                color: {
                  r: color.r,
                  g: color.g,
                  b: color.b,
                },
                opacity: color.a || 1,
              } as SolidPaint);
            }

            const rectNode = {
              type: 'RECTANGLE',
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              fills: fills as any,
            } as RectangleNode;

            if (computedStyle.border) {
              const parsed = computedStyle.border.match(/^([\d\.]+)px\s*(\w+)\s*(.*)$/);
              if (parsed) {
                let [_match, width, type, color] = parsed;
                if (width && width !== '0' && type !== 'none' && color) {
                  const rgb = getRgb(color);
                  if (rgb) {
                    rectNode.strokes = [
                      {
                        type: 'SOLID',
                        color: { r: rgb.r, b: rgb.b, g: rgb.g },
                        opacity: rgb.a || 1,
                      },
                    ];
                    rectNode.strokeWeight = Math.round(parseFloat(width));
                  }
                }
              }
            }

            if (!rectNode.strokes) {
              const capitalize = (str: string) => str[0].toUpperCase() + str.substring(1);
              const directions = ['top', 'left', 'right', 'bottom'];
              for (const dir of directions) {
                const computed = computedStyle[('border' + capitalize(dir)) as any];
                if (computed) {
                  const parsed = computed.match(/^([\d\.]+)px\s*(\w+)\s*(.*)$/);
                  if (parsed) {
                    let [_match, borderWidth, type, color] = parsed;
                    if (borderWidth && borderWidth !== '0' && type !== 'none' && color) {
                      const rgb = getRgb(color);
                      if (rgb) {
                        const width = ['top', 'bottom'].includes(dir)
                          ? rect.width
                          : parseFloat(borderWidth);
                        const height = ['left', 'right'].includes(dir)
                          ? rect.height
                          : parseFloat(borderWidth);
                        layers.push({
                          type: 'RECTANGLE',
                          x:
                            dir === 'left'
                              ? rect.left - width
                              : dir === 'right'
                                ? rect.right
                                : rect.left,
                          y:
                            dir === 'top'
                              ? rect.top - height
                              : dir === 'bottom'
                                ? rect.bottom
                                : rect.top,
                          width,
                          height,
                          fills: [
                            {
                              type: 'SOLID',
                              color: { r: rgb.r, b: rgb.b, g: rgb.g },
                              opacity: rgb.a || 1,
                            } as SolidPaint,
                          ] as any,
                        } as RectangleNode);
                      }
                    }
                  }
                }
              }
            }

            if (computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none') {
              const urlMatch = computedStyle.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
              const url = urlMatch && urlMatch[1];
              if (url) {
                fills.push({
                  url,
                  type: 'IMAGE',
                  // TODO: backround size, position
                  scaleMode: computedStyle.backgroundSize === 'contain' ? 'FIT' : 'FILL',
                  imageHash: null,
                } as ImagePaint);
              }
            }
            if (el instanceof SVGSVGElement) {
              const url = `data:image/svg+xml,${encodeURIComponent(
                el.outerHTML.replace(/\s+/g, ' ')
              )}`;
              if (url) {
                fills.push({
                  url,
                  type: 'IMAGE',
                  // TODO: object fit, position
                  scaleMode: 'FILL',
                  imageHash: null,
                } as ImagePaint);
              }
            }
            if (el instanceof HTMLImageElement) {
              const url = el.src;
              if (url) {
                fills.push({
                  url,
                  type: 'IMAGE',
                  // TODO: object fit, position
                  scaleMode: computedStyle.objectFit === 'contain' ? 'FIT' : 'FILL',
                  imageHash: null,
                } as ImagePaint);
              }
            }
            if (el instanceof HTMLVideoElement) {
              const url = el.poster;
              if (url) {
                fills.push({
                  url,
                  type: 'IMAGE',
                  // TODO: object fit, position
                  scaleMode: computedStyle.objectFit === 'contain' ? 'FIT' : 'FILL',
                  imageHash: null,
                } as ImagePaint);
              }
            }

            if (computedStyle.boxShadow && computedStyle.boxShadow !== 'none') {
              interface ParsedBoxShadow {
                inset: boolean;
                offsetX: number;
                offsetY: number;
                blurRadius: number;
                spreadRadius: number;
                color: string;
              }
              const LENGTH_REG = /^[0-9]+[a-zA-Z%]+?$/;
              const toNum = (v: string): number => {
                // if (!/px$/.test(v) && v !== '0') return v;
                if (!/px$/.test(v) && v !== '0') return 0;
                const n = parseFloat(v);
                // return !isNaN(n) ? n : v;
                return !isNaN(n) ? n : 0;
              };
              const isLength = (v: string) => v === '0' || LENGTH_REG.test(v);
              const parseValue = (str: string): ParsedBoxShadow => {
                // TODO: this is broken for multiple box shadows
                if (str.startsWith('rgb')) {
                  // Werid computed style thing that puts the color in the front not back
                  const colorMatch = str.match(/(rgba?\(.+?\))(.+)/);
                  if (colorMatch) {
                    str = (colorMatch[2] + ' ' + colorMatch[1]).trim();
                  }
                }

                const PARTS_REG = /\s(?![^(]*\))/;
                const parts = str.split(PARTS_REG);
                const inset = parts.includes('inset');
                const last = parts.slice(-1)[0];
                const color = !isLength(last) ? last : 'rgba(0, 0, 0, 1)';

                const nums = parts
                  .filter(n => n !== 'inset')
                  .filter(n => n !== color)
                  .map(toNum);

                const [offsetX, offsetY, blurRadius, spreadRadius] = nums;

                // console.log('shadow', str, JSON.stringify({
                //   inset,
                //   offsetX,
                //   offsetY,
                //   blurRadius,
                //   spreadRadius,
                //   color,
                // }));

                return {
                  inset,
                  offsetX,
                  offsetY,
                  blurRadius,
                  spreadRadius,
                  color,
                };
              };

              const parsed = parseValue(computedStyle.boxShadow);
              const color = getRgb(parsed.color);
              if (color) {
                rectNode.effects = [
                  {
                    color,
                    type: 'DROP_SHADOW',
                    radius: parsed.blurRadius,
                    blendMode: 'NORMAL',
                    visible: true,
                    offset: {
                      x: parsed.offsetX,
                      y: parsed.offsetY,
                    },
                  } as ShadowEffect,
                ];
              }
            }

            const borderTopLeftRadius = parseUnits(computedStyle.borderTopLeftRadius);
            if (borderTopLeftRadius) {
              rectNode.topLeftRadius = borderTopLeftRadius.value;
            }
            const borderTopRightRadius = parseUnits(computedStyle.borderTopRightRadius);
            if (borderTopRightRadius) {
              rectNode.topRightRadius = borderTopRightRadius.value;
            }
            const borderBottomRightRadius = parseUnits(computedStyle.borderBottomRightRadius);
            if (borderBottomRightRadius) {
              rectNode.bottomRightRadius = borderBottomRightRadius.value;
            }
            const borderBottomLeftRadius = parseUnits(computedStyle.borderBottomLeftRadius);
            if (borderBottomLeftRadius) {
              rectNode.bottomLeftRadius = borderBottomLeftRadius.value;
            }

            layers.push(rectNode);
          }
        }
      });
    }

    const textNodes = textNodesUnder(el);

    function getRgb(colorString?: string | null) {
      if (!colorString) {
        return null;
      }
      const [_1, r, g, b, _2, a] = (colorString!.match(
        /rgba?\(([\d\.]+), ([\d\.]+), ([\d\.]+)(, ([\d\.]+))?\)/
      )! || []) as string[];

      const none = a && parseFloat(a) === 0;

      if (r && g && b && !none) {
        return {
          r: parseInt(r) / 255,
          g: parseInt(g) / 255,
          b: parseInt(b) / 255,
          a: a ? parseFloat(a) : 1,
        };
      }
      return null;
    }

    const fastClone = (data: any) => JSON.parse(JSON.stringify(data));

    for (const node of textNodes) {
      if (node.textContent && node.textContent.trim().length) {
        const parent = node.parentElement;
        if (parent) {
          if (isHidden(parent)) {
            continue;
          }
          const computedStyles = getComputedStyle(parent);
          const range = document.createRange();
          range.selectNode(node);
          const rect = fastClone(range.getBoundingClientRect());
          const lineHeight = parseUnits(computedStyles.lineHeight);
          range.detach();
          if (lineHeight && rect.height < lineHeight.value) {
            const delta = lineHeight.value - rect.height;
            rect.top -= delta / 2;
            rect.height = lineHeight.value;
          }
          if (rect.height < 1 || rect.width < 1) {
            continue;
          }

          const textNode = {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            type: 'TEXT',
            characters: node.textContent.trim().replace(/\s+/, ' ') || '',
          } as TextNode;

          const fills: SolidPaint[] = [];
          const rgb = getRgb(computedStyles.color);

          if (rgb) {
            fills.push({
              type: 'SOLID',
              color: {
                r: rgb.r,
                g: rgb.g,
                b: rgb.b,
              },
              opacity: rgb.a || 1,
            } as SolidPaint);
          }

          if (fills.length) {
            textNode.fills = fills;
          }
          const letterSpacing = parseUnits(computedStyles.letterSpacing);
          if (letterSpacing) {
            textNode.letterSpacing = letterSpacing;
          }

          if (lineHeight) {
            textNode.lineHeight = lineHeight;
          }

          const { textTransform } = computedStyles;
          switch (textTransform) {
            case 'uppercase': {
              textNode.textCase = 'UPPER';
              break;
            }
            case 'lowercase': {
              textNode.textCase = 'LOWER';
              break;
            }
            case 'capitalize': {
              textNode.textCase = 'TITLE';
              break;
            }
          }

          const fontSize = parseUnits(computedStyles.fontSize);
          if (fontSize) {
            textNode.fontSize = Math.round(fontSize.value);
          }
          if (computedStyles.fontFamily) {
            (textNode as any).fontFamily = computedStyles.fontFamily;
          }

          if (computedStyles.textDecoration) {
            if (
              computedStyles.textDecoration === 'underline' ||
              computedStyles.textDecoration === 'strikethrough'
            ) {
              textNode.textDecoration = computedStyles.textDecoration.toUpperCase() as any;
            }
          }
          if (computedStyles.textAlign) {
            if (['left', 'center', 'right', 'justified'].includes(computedStyles.textAlign)) {
              textNode.textAlignHorizontal = computedStyles.textAlign.toUpperCase() as any;
            }
          }

          layers.push(textNode);
        }
      }
    }
  }

  // TODO: send frame: { children: []}
  return [
    {
      type: 'FRAME',
      width: Math.round(window.innerWidth),
      height: Math.round(document.documentElement.scrollHeight),
      x: 0,
      y: 0,
    },
  ].concat(layers);
}

