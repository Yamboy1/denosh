export function replaceExpansions(input: string) {
  // expand ~ to home dir if it exists, otherwise don't change anything
  return input.replace(/(?<=^|\s)~/g, `${Deno.dir("home") ?? "~"}`);
}
