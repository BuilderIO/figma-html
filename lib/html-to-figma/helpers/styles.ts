export function getAppliedComputedStyles(
  element: Element,
  pseudo?: string
): { [key: string]: string } {
  if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
    return {};
  }

  const styles = getComputedStyle(element, pseudo);

  const list: (keyof React.CSSProperties)[] = [
    "opacity",
    "backgroundColor",
    "border",
    "borderTop",
    "borderLeft",
    "borderRight",
    "borderBottom",
    "borderRadius",
    "backgroundImage",
    "borderColor",
    "boxShadow",
  ];

  const color = styles.color;

  const defaults: any = {
    transform: "none",
    opacity: "1",
    borderRadius: "0px",
    backgroundImage: "none",
    backgroundPosition: "0% 0%",
    backgroundSize: "auto",
    backgroundColor: "rgba(0, 0, 0, 0)",
    backgroundAttachment: "scroll",
    border: "0px none " + color,
    borderTop: "0px none " + color,
    borderBottom: "0px none " + color,
    borderLeft: "0px none " + color,
    borderRight: "0px none " + color,
    borderWidth: "0px",
    borderColor: color,
    borderStyle: "none",
    boxShadow: "none",
    fontWeight: "400",
    textAlign: "start",
    justifyContent: "normal",
    alignItems: "normal",
    alignSelf: "auto",
    flexGrow: "0",
    textDecoration: "none solid " + color,
    lineHeight: "normal",
    letterSpacing: "normal",
    backgroundRepeat: "repeat",
    zIndex: "auto", // TODO
  };

  function pick<T extends { [key: string]: V }, V = any>(
    object: T,
    paths: (keyof T)[]
  ) {
    const newObject: Partial<T> = {};
    paths.forEach((path) => {
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
