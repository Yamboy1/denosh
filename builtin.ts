import { writeLine } from "./util.ts";

function changeDir([,directory]: string[]) {
  // input, or home dir, or current dir
  Deno.chdir(directory || (Deno.dir("home") ?? "."));
}

function exit([,code = "0"]: string[]) {
  let num = parseInt(code, 10);
  if (isNaN(num)) {
    writeLine("exit code must be a number", Deno.stderr);
    return;
  }
  Deno.exit(num);
}

export const builtins = new Map<string, (_:string[]) => void>()
  .set("cd", changeDir)
  .set("exit", exit);