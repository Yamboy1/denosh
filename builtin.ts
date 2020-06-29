import {
  fromStreamWriter,
  fromStreamReader,
} from "https://deno.land/std@a829fa8/io/streams.ts";
import { writeLine, write } from "./util.ts";

export interface ProcessLike {
  stdin: Deno.Writer & Deno.Closer;
  stdout: Deno.Reader & Deno.Closer;
  stderr: Deno.Reader & Deno.Closer;
  status(): Promise<Deno.ProcessStatus>;
}

export function runBuiltin(args: string[]): ProcessLike | undefined {
  const {
    // reader: stdin,
    writer: stdinWriter,
  } = fromTransformStream(new TransformStream());

  const {
    reader: stderrReader,
    writer: stderr,
  } = fromTransformStream(new TransformStream());

  const {
    reader: stdoutReader,
    writer: stdout,
  } = fromTransformStream(new TransformStream());

  let status: () => Promise<Deno.ProcessStatus>;

  switch (args[0]) {
    case "cd":
      status = async () => {
        // input, or home dir, or current dir
        const newDir = args[1] || Deno.env.get("HOME") || null;

        if (!newDir) {
          await writeLine(
            "Error: Could not detect home directory, please set your $HOME env var",
            stderr,
          );
          return { success: false, code: 2 };
        }
        Deno.chdir(args[1] || Deno.env.get("HOME") || ".");
        return { success: true, code: 0, signal: undefined };
      };
      break;

    case "exit":
      status = async () => {
        Deno.exit(Number(args[1]) || 0);
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
      return status()
        .catch(async (e) => {
          writeLine(e.toString(), stderr);
          return { success: false, code: 2 } as const;
        })
        .then(async (x) => (stderr.closeAsync(), x))
        .then(async (x) => (stdout.closeAsync(), x));
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
