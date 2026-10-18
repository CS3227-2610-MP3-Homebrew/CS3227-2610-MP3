import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function testFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return testFiles(path);
    return entry.isFile() && /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name)
      ? [path]
      : [];
  });
}

export function testTitles(source: string): string[] {
  // Tokenize without executing tests. Comments and complete strings stay opaque,
  // so IDs in test bodies, fixtures, imports or comments do not imply coverage.
  const tokens = Array.from(
    source.matchAll(
      /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`|[\w$]+|[^\s]/g,
    ),
    (match) => match[0],
  ).filter((token) => !token.startsWith("//") && !token.startsWith("/*"));
  const titles: string[] = [];
  for (let index = 0; index < tokens.length; index++) {
    if (!["test", "it"].includes(tokens[index]) || tokens[index - 1] === ".") continue;
    let cursor = index + 1;
    let isTest = true;
    while (tokens[cursor] === ".") {
      const modifier = tokens[cursor + 1];
      if (!["only", "skip", "todo", "concurrent", "sequential", "fails", "fail", "fixme", "each", "for"].includes(modifier)) {
        isTest = false;
        break;
      }
      cursor += 2;
      // Parameterized Vitest titles follow the data call: test.each([...])("...").
      if (["each", "for"].includes(modifier) && tokens[cursor] === "(") {
        let depth = 0;
        do {
          if (tokens[cursor] === "(") depth++;
          if (tokens[cursor] === ")") depth--;
          cursor++;
        } while (cursor < tokens.length && depth > 0);
      }
    }
    const title = tokens[cursor + 1];
    // Require a literal title; dynamic/interpolated names need explicit IDs.
    if (isTest && tokens[cursor] === "(" && title && /^["'`]/.test(title) && !title.includes("${")) {
      titles.push(title.slice(1, -1));
    }
  }
  return titles;
}
