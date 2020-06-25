import { encode } from "./codec.ts";

export async function write(
  text: string = "",
  output: Deno.Writer = Deno.stdout,
) {
  return output.write(encode(text));
}

export async function writeLine(
  text: string = "",
  output: Deno.Writer = Deno.stdout,
) {
  return write(`${text}\n`, output);
}
