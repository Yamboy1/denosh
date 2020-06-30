import {
  fromStreamWriter,
  fromStreamReader,
} from "https://deno.land/std@a829fa8/io/streams.ts";
import { writeLine } from "./util.ts";

export interface ProcessLike {
  stdin: Deno.Writer & Deno.Closer | null;
  stdout: Deno.Reader & Deno.Closer | null;
  stderr: Deno.Reader & Deno.Closer | null;
  status(): Promise<Deno.ProcessStatus>;
}

interface RunBuiltinOptions {
  cmd: string[],
  stdin?: "inherit" | "piped";
  stdout?: "inherit" | "piped";
  stderr?: "inherit" | "piped";
}

export function runBuiltin(opts: RunBuiltinOptions): ProcessLike | undefined {
  let stdinReader: Deno.Reader & Deno.Closer & Partial<AsyncCloser> = Deno.stdin;
  let stdinWriter: (Deno.Writer & Deno.Closer & Partial<AsyncCloser>) | null = null;

  let stdoutWriter: Deno.Writer & Deno.Closer & Partial<AsyncCloser> = Deno.stdout;
  let stdoutReader: (Deno.Reader & Deno.Closer & Partial<AsyncCloser>) | null = null;

  let stderrWriter: Deno.Writer & Deno.Closer & Partial<AsyncCloser> = Deno.stderr;
  let stderrReader: (Deno.Reader & Deno.Closer & Partial<AsyncCloser>) | null = null;

  if (opts.stdin === "piped") {
    const stream = fromTransformStream(new TransformStream());
    stdinReader = stream.reader;
    stdinWriter = stream.writer;
  }

  if (opts.stdout === "piped") {
    const stream = fromTransformStream(new TransformStream());
    stdoutWriter = stream.writer;
    stdoutReader = stream.reader;
  }

  if (opts.stderr === "piped") {
    const stream = fromTransformStream(new TransformStream());
    stderrWriter = stream.writer;
    stderrReader = stream.reader;
  }

  let status: () => Promise<Deno.ProcessStatus>;

  switch (opts.cmd[0]) {
    case "cd":
      status = async () => {
        // input, or home dir, or current dir
        const newDir = opts.cmd[1] || Deno.env.get("HOME") || null;

        if (!newDir) {
          await writeLine(
            "cd: could not detect home directory, please set your $HOME env var",
            stderrWriter,
          );
          return { success: false, code: 2 };
        }

        try {
          Deno.chdir(newDir);
        } catch (e) {
          if (e instanceof Deno.errors.NotFound) {
            await writeLine(
              `cd: file or directory not found: ${newDir}`,
              stderrWriter,
            );
          } else if (e.message === "Not a directory (os error 20)") {
            await writeLine(`cd: not a directory: ${newDir}`, stderrWriter);
          } else if (e instanceof Deno.errors.PermissionDenied) {
            await writeLine(`cd: permission denied: ${newDir}`, stderrWriter);
          } else {
            await writeLine(`cd: an error occured: ${e.message}`);
          }
          return { success: false, code: 2 };
        }
        return { success: true, code: 0 };
      };
      break;

    case "exit":
      status = async () => {
        Deno.exit(Number(opts.cmd[1]) || 0);
      };
      break;

    default:
      return;
  }

  return {
    stdin: stdinWriter,
    stdout: stdoutReader,
    stderr: stderrReader,
    status: async () => {
      const result = await status();

      // Only close streams, not external resources...
      stdoutWriter.closeAsync?.();
      stderrWriter.closeAsync?.();

      return result;
    },
  };
}

interface AsyncCloser {
  closeAsync(): Promise<void>;
}

function fromTransformStream(
  stream: TransformStream,
): {
  writer: Deno.Writer & Deno.Closer & AsyncCloser;
  reader: Deno.Reader & Deno.Closer & AsyncCloser;
} {
  const streamWriter = stream.writable.getWriter();
  const streamReader = stream.readable.getReader();

  return {
    writer: {
      ...fromStreamWriter(streamWriter),
      close: () => streamWriter.close(),
      closeAsync: async () => await streamWriter.close(),
    },
    reader: {
      ...fromStreamReader(streamReader),
      close: () => streamReader.cancel(),
      closeAsync: async () => await streamReader.cancel(),
    },
  };
}
