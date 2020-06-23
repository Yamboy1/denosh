import { decode, encode } from "../codec.ts";
import { write, writeLine } from "../util.ts";
import { cursorUp, cursorDown, cursorForward, cursorBack, clearLine, cursorHorizPosition, deleteKey } from "./ansi.ts";
import { ETX, LF, CR, EOT, ESC, BS, DEL } from "./ascii.ts";

type InvalidCharacter = "EOF" | "Interrupted";

class InvalidCharacterError extends Error {
  constructor(char: InvalidCharacter) {
    super(`Invalid Character: ${char}`);
  }
}

async function getLine() {
  Deno.setRaw(0, true);
  const input: string[] = [];
  let curPos = 0;

  for await(const chunk of Deno.iter(Deno.stdin)) {
    const decoded = decode(chunk);

    // ANSI control sequences
    if (decoded.startsWith(ESC)) {
      switch(decoded) {
        case cursorBack():
          if (curPos > 0) {
            await write(cursorBack());
            curPos--
          }
          continue;

        case cursorForward():
          if (curPos < input.length) {
            await write(cursorForward());
            curPos++
          }
          continue;

        case deleteKey():
          if (curPos < input.length) {
            input.splice(curPos, 1);
          }
          break;

        default:
          // Any escape sequences not specified will be skipped
          continue;
        }
    } else {
      switch (decoded) {
        // ETX (ctrl-c): https://en.wikipedia.org/wiki/End-of-Text_character
        case ETX:
          await resetTerminal();
          throw new InvalidCharacterError("Interrupted");

        // EOT (ctrl-d): https://en.wikipedia.org/wiki/End-of-Transmission_character
        case EOT:
          await resetTerminal();
          throw new InvalidCharacterError("EOF");

        // Note that DEL is mapped to backspace not delete on most terminals
        case BS:
        case DEL:
          if (curPos > 0) {
            input.splice(curPos-1, 1);
            curPos--;
          }
          break;

        // End the prompt on a newline
        case LF:
        case CR:
        case CR + LF:
          await resetTerminal();
          return input.join("");

        // All other characters are assumed to be text
        default:
          // Insert the new character(s) at the current position
          input.splice(curPos, 0, ...decoded.split(""));
          curPos += decoded.split("").length;
      }
    }

    await write(clearLine());
    await write(cursorHorizPosition());
    await write(input.join(""));
    // Ansi escapes are 1-indexed
    await write(cursorHorizPosition(curPos+1));
  }
}

async function resetTerminal() {
  // Reset cursor position to left
  await writeLine(cursorHorizPosition());
  Deno.setRaw(0, false);
}

console.log(await getLine())

addEventListener("unload", () => {
  // Ensure that raw mode is off on unload
  Deno.setRaw(0, false);
});