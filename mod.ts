import { writeLine } from "./util.ts";
import { parseCommandArgs } from "./parser.ts";
import { replaceExpansions } from "./expansions.ts";
import { runBuiltin } from "./builtin.ts";
import { pipe } from "./pipe.ts";
import { getLine, InterruptedError, EOFError } from "./readline/mod.ts";

(async () => {
  // When interrupting a process, the shells gets a sigint as well,
  // and this closes the shell, so we need to stop this.
  for await (const _ of Deno.signal(Deno.Signal.SIGINT)) {}  
})();

while (true) {
  let line;
  try {
    line = await getLine(`${Deno.cwd()}> `);
  } catch (e) {
    if (e instanceof InterruptedError) {
      // On a ctrl-c, just continue the repl
      continue;
    } else if (e instanceof EOFError) {
      // On a ctrl-d, quit the shell
      Deno.exit(0);
    } else {
      await writeLine(`An internal error occurred: ${e}`, Deno.stderr);
      continue;
    }
  }

  const pipeArgs = parseCommandArgs(replaceExpansions(line.trim()));

  // Check that there is a command name
  if (!pipeArgs[0]?.[0]) continue;

  const processes = pipeArgs.map((args) => {
    return runBuiltin(args) ?? 
      Deno.run({
        cmd: args,
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      })
  });

  // hook up the pipe to stdin and stdout
  Deno.copy(Deno.stdin, processes[0].stdin)
    .then(() => processes[0].stdin.close());
  Deno.copy(processes[processes.length - 1].stdout, Deno.stdout);
  Deno.copy(processes[processes.length - 1].stderr, Deno.stderr);

  // pipe the processes together, and wait for
  // the final one to complete
  pipe(...processes);
  
  const status = await processes[processes.length - 1].status();

  if (status.signal === Deno.Signal.SIGINT) {
    await writeLine();
  }
}
