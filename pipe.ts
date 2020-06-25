export function pipe(
  ...processes: Deno.Process<
    { cmd: string[]; stdout: "piped"; stdin: "piped" }
  >[]
) {
  // there needs to be an input and output
  // element at all times
  while (processes.length > 1) {
    const [p1, p2] = processes;

    // have to manually check for null
    // as it has been casted as "piped"
    if (p1.stdout === null) {
      throw new TypeError("Process stdout should be set to 'piped'");
    }
    if (p2.stdin === null) {
      throw new TypeError("Process stdin should be set to 'piped'");
    }

    Deno.copy(p1.stdout, p2.stdin)
      .then(() => p2.stdin.close());

    processes.shift();
  }
}
