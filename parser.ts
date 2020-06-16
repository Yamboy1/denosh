export function parseCommandArgs(input: string) {
  const args = [];
  let startIndex = 0;
  let currentQuote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === " " && currentQuote === null) {
      if (startIndex !== i) {
        args.push(input.slice(startIndex, i));
      }
      startIndex = i + 1;
    } else if (char === "'" || char === '"') {
      currentQuote = currentQuote ? null : char;
    }
  }
  if (startIndex !== input.length) {
    args.push(input.slice(startIndex));
  }
  return args;
}
