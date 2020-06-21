import { encode, decode } from "./codec.ts";

export function getLine() {
  return Deno.iter(Deno.stdin).next()
    .then(({ value }) => value as Uint8Array)
    .then((value) => decode(value));
}

export async function write(text: string, output: Deno.Writer = Deno.stdout) {
  return output.write(encode(text));
}

export async function writeLine(text: string, output: Deno.Writer = Deno.stdout) {
  return write(`${text}\n`, output);
}
