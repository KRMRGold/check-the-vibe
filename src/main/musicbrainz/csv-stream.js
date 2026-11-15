import { StringDecoder } from "node:string_decoder";

// Streams CSV rows without retaining the complete file. StringDecoder keeps
// multi-byte UTF-8 characters intact when a byte sequence spans chunks.
export async function* parseCsvStream(readable) {
  const decoder = new StringDecoder("utf8");
  let row = [];
  let cell = "";
  let quoted = false;
  let pendingQuote = false;

  function* consume(text) {
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (quoted) {
        if (pendingQuote) {
          if (character === '"') {
            cell += '"';
            pendingQuote = false;
            continue;
          }
          quoted = false;
          pendingQuote = false;
        } else if (character === '"') {
          pendingQuote = true;
          continue;
        } else {
          cell += character;
          continue;
        }
      }

      if (character === '"' && cell.length === 0) quoted = true;
      else if (character === ",") {
        row.push(cell);
        cell = "";
      } else if (character === "\\n") {
        row.push(cell.replace(/\\r$/u, ""));
        if (row.some((value) => value.length)) yield row;
        row = [];
        cell = "";
      } else cell += character;
    }
  }

  for await (const chunk of readable) {
    yield* consume(decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  }
  yield* consume(decoder.end());

  if (pendingQuote) {
    quoted = false;
    pendingQuote = false;
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\\r$/u, ""));
    if (row.some((value) => value.length)) yield row;
  }
}