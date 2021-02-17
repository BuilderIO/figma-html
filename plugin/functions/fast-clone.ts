export const fastClone = <T extends any>(obj: T): T =>
  typeof obj === "symbol" ? null : JSON.parse(JSON.stringify(obj));
