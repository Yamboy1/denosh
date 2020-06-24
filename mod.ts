import { write, writeLine } from "./util.ts";
import { parseCommandArgs } from "./parser.ts";
import { replaceExpansions } from "./expansions.ts";
import { builtins } from "./builtin.ts";
import { pipe } from "./pipe.ts";
import { getLine, InterruptedError, EOFError } from "./readline/mod.ts"

while (true) {
  let line;
  try {
    line = await getLine(`${Deno.cwd()}> `);
  } catch (e) {
    if (e instanceof InterruptedError) {
      // On a ctrl-c, just continue the repl
      await writeLine();
      continue;
    } else if (e instanceof EOFError) {
      // On a ctrl-d, quit the shell
      await writeLine();
      Deno.exit(0);
    } else {
      await writeLine(`An internal error occurred${e}`, Deno.stderr);
      continue;
    }
  }

  const pipeArgs = parseCommandArgs(replaceExpansions(line.trim()))

  if (pipeArgs[0][0] === "") continue;

  // final command status
  let status;
  if (pipeArgs.length === 1) {
    const [args] = pipeArgs;

    try {
      // built-in commands such as cd
      if (builtins.has(args[0])) {
        builtins.get(args[0])?.(args);
        continue;
      }

      // everything else lol
      const process = Deno.run({ cmd: args });
      status = await process.status();
      
    } catch (e) {
      await writeLine(e, Deno.stderr);
    }
  } else {
    // note, builtin commands don't work in pipes
    const processes = pipeArgs.map(args =>
      Deno.run({
        cmd: args,
        stdin: "piped",
        stdout: "piped"
      }));

    // hook up the pipe to stdin and stdout
    Deno.copy(Deno.stdin, processes[0].stdin)
      .then(() => processes[0].stdin.close());
    Deno.copy(processes[processes.length-1].stdout, Deno.stdout)

    // pipe the processes together, and wait for
    // the final one to complete
    pipe(...processes);
    status = await processes[processes.length-1].status();
  }

  if (status?.success === false) {
    if (status.signal === Deno.Signal.SIGINT)
      await writeLine();
      continue;
  }
}
