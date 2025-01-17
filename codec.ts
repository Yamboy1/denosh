/** A default TextEncoder instance */
export const encoder = new TextEncoder();

/** Shorthand for new TextEncoder().encode() */
export function encode(input?: string) {
  return encoder.encode(input);
}

/** A default TextDecoder instance */
export const decoder = new TextDecoder();

/** Shorthand for new TextDecoder().decode() */
export function decode(input?: Uint8Array) {
  return decoder.decode(input);
}
