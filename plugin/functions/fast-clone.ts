export const fastClone = <T extends any>(obj: T): T =>
  JSON.parse(JSON.stringify(obj));
