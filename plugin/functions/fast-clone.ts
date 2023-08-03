export const fastClone = <T extends any>(obj: T): T =>
  typeof obj === "symbol" ? null : JSON.parse(JSON.stringify(obj));

export function deepClone(obj: any, hash = new WeakMap()) {
  if (Object(obj) !== obj || obj instanceof Function || obj instanceof RegExp) {
    return obj; // Return primitives, functions, and regular expressions as is
  }

  if (hash.has(obj)) {
    return hash.get(obj); // If cyclic reference, return the cached version
  }

  const result: any = Array.isArray(obj) ? [] : {};

  hash.set(obj, result); // Cache the cloned object

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = deepClone(obj[key], hash); // Recursively clone nested objects
    }
  }

  return result;
}
