import { ESC } from "./ascii.ts";

const CSI = "["

export function control(code: string, n?: number) {
  return `${ESC}${CSI}${n ?? ""}${code}`;
}

export function cursorUp(n?: number) {
  return control("A", n);
}

export function cursorDown(n?: number) {
  return control("B", n);
}

export function cursorForward(n?: number) {
  return control("C", n);
}

export function cursorBack(n?: number) {
  return control("D", n);
}

export function cursorHorizPosition(n?: number) {
  return control("G", n);
}

export function clearLine() {
  return control("K", 2);
}

export function deleteKey() {
  return control("~", 3);
}