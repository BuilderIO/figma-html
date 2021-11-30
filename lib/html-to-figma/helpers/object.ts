export function size(obj: object) {
  return Object.keys(obj).length;
}

export const fastClone = (data: any) =>
  typeof data === "symbol" ? null : JSON.parse(JSON.stringify(data));
