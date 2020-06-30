import { writeLine } from "./util.ts";
import { parseCommandArgs } from "./parser.ts";
import { replaceExpansions } from "./expansions.ts";
import { runBuiltin, ProcessLike } from "./builtin.ts";
import { pipe } from "./pipe.ts";
import { getLine, InterruptedError, EOFError } from "./readline/mod.ts";

(async () => {
  // When interrupting a process, the shells gets a sigint as well,
  // and this closes the shell, so we need to stop this.
  for await (const _ of Deno.signal(Deno.Signal.SIGINT)) {}
})();

main:
while (true) {
  let line;
  try {
    line = await getLine(`${Deno.cwd()}> `);
  } catch (e) {
    if (e instanceof InterruptedError) {
      // On a ctrl-c, just continue the repl
    } else if (e instanceof EOFError) {
      // On a ctrl-d, quit the shell
      Deno.exit(0);
    } else {
      await writeLine(
        `denosh: a readline error has occurred: ${e.message}`,
        Deno.stderr,
      );
    }
    continue;
  }

  const pipeArgs = parseCommandArgs(replaceExpansions(line.trim()));

  // Check that there is a command name
  if (!pipeArgs[0]?.[0]) continue;

  let i = 0;
  let processes: ProcessLike[] = [];
  for await (const args of pipeArgs) {
    try {
      processes.push(
        runBuiltin({
          cmd: args,
          // The first process should inherit from stdin
          stdin: i === 0 ? "inherit" : "piped",
          // The last process should inherit from stdout
          stdout: i === pipeArgs.length - 1 ? "inherit" : "piped",
          stderr: i === pipeArgs.length - 1 ? "inherit" : "piped",
        }) ??
        Deno.run({
          cmd: args,
          // The first process should inherit from stdin
          stdin: i === 0 ? "inherit" : "piped",
          // The last process should inherit from stdout
          stdout: i === pipeArgs.length - 1 ? "inherit" : "piped",
          stderr: i === pipeArgs.length - 1 ? "inherit" : "piped",
        }),
      );
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        await writeLine(`denosh: command not found: ${args[0]}`, Deno.stderr);
      } else {
        await writeLine(
          `denosh: an internal error has occured: ${e.message}`,
          Deno.stderr,
        );
      }
      continue main;
    }
    i++;
  }

  pipe(...processes);

  const status = await processes[processes.length - 1].status();

  if (status.signal === Deno.Signal.SIGINT) {
    await writeLine();
  }
}
