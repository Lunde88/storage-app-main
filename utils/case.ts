// utils/case.ts

// SnakeCase utility type to convert string keys to snake_case
export type SnakeCase<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends Lowercase<Head>
    ? `${Head}${SnakeCase<Tail>}`
    : `_${Lowercase<Head>}${SnakeCase<Tail>}`
  : "";

// Recursively map all keys in T to SnakeCase<key>, preserving value types
export type SnakeKeys<T> = T extends Array<infer U>
  ? Array<SnakeKeys<U>>
  : T extends object
  ? { [K in keyof T as SnakeCase<K & string>]: SnakeKeys<T[K]> }
  : T;

/**
 * Convert a single camelCase or PascalCase string to snake_case.
 */
export function toSnakeCase(str: string): string {
  return (
    str
      // insert an underscore before all uppercase letters, then lowercase the whole thing
      .replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`)
      // if it started with an uppercase letter, we’ll have a leading underscore—strip it
      .replace(/^_/, "")
  );
}

/**
 * Recursively walk an object or array and convert all keys to snake_case.
 */
export function keysToSnakeCase<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => keysToSnakeCase(item)) as unknown as T;
  }

  if (obj !== null && typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>).map(
      ([key, value]) => [toSnakeCase(key), keysToSnakeCase(value)]
    );
    return Object.fromEntries(entries) as T;
  }

  // primitives (string, number, boolean, null, undefined, etc.) are returned as-is
  return obj;
}

// Recursively convert snake_case keys to camelCase
export function keysToCamelCase<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamelCase) as unknown as T;
  } else if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, char) => char.toUpperCase()),
        keysToCamelCase(v),
      ])
    ) as T;
  }
  return obj;
}
