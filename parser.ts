export function parseCommandArgs(input: string): string[][] {
  const pipeArgs: string[][] = [];
  let args: string[] = [];
  let startIndex = 0;
  let currentQuote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (currentQuote === null) {
      if (char === " ") {
        if (startIndex !== i) {
          args.push(input.slice(startIndex, i));
        }
        startIndex = i + 1;
      } else if (char === "|") {
        pipeArgs.push(args);
        args = [];
        startIndex = i + 1;
      }
    }

    if (char === "'" || char === '"') {
      currentQuote = currentQuote ? null : char;
    }
  }

  if (startIndex !== input.length) {
    args.push(input.slice(startIndex));
  }

  if (args.length > 0) {
    pipeArgs.push(args);
  }

  return pipeArgs;
}
