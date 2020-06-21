import { getLine, write, writeLine } from "./util.ts";
import { parseCommandArgs } from "./parser.ts";
import { replaceExpansions } from "./expansions.ts";
import { builtins } from "./builtin.ts";
import { pipe } from "./pipe.ts";

let signalPromise = Deno.signal(Deno.Signal.SIGINT);

while (true) {
  await write(`${Deno.cwd()}> `);
  const line = await Promise.race([getLine(), signalPromise]);

  // check for SIGINT (ctrl-c)
  if (line === undefined) {
    signalPromise = Deno.signal(Deno.Signal.SIGINT);
    await writeLine();
    continue;
  }

  // Check for EOF (ctrl-d)
  if (line.length === 0) {
    await writeLine();
    Deno.exit(0);
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
