import { builtins } from "./builtin.ts";
import { replaceExpansions } from "./expansions.ts";
import { getLine, runProcess, write, writeLine } from "./util.ts";

let signalPromise = Deno.signal(Deno.Signal.SIGINT);

while (true) {
  await write(`${Deno.cwd()}> `);
  const line = await Promise.race([getLine(), signalPromise]);

  // check for SIGINT (ctrl-c)
  if (line === undefined) {
    signalPromise = Deno.signal(Deno.Signal.SIGINT);
    await writeLine("");
    continue;
  }

  // Check for EOF (ctrl-d)
  if (line.length === 0) {
    await writeLine("");
    Deno.exit(0);
  }

  const args = replaceExpansions(line)
    .trim()
    .split(" ");

  if (args[0] === "") continue;

  try {

    // built-in commands such as cd
    if (builtins.has(args[0])) {
      builtins.get(args[0])?.(args);
      continue;
    }

    // everything else lol
    const process = runProcess(args);
    await process.status();
    
  } catch (e) {
    await writeLine(e, Deno.stderr);
  }
}