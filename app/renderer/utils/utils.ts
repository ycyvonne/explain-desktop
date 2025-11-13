export function normalizeMd(input: string) {
  let md = input;

  // 1) Convert \[ ... \]  ->  $$ ... $$
  md = md.replace(/\\\[(.+?)\\\]/gs, (_, content) => {
    return `\n\n$$${content.trim()}$$\n\n`;
  });

  // 2) Convert \( ... \)  ->  $ ... $
  md = md.replace(/\\\((.+?)\\\)/gs, (_, content) => {
    return `$${content.trim()}$`;
  });

  return md
    // Join lines that are only "1." / "2." etc. with the following line.
    .replace(/(^|\n)(\s*)(\d+)\.\s*\n(?!\s*[-*+]|\s*\d+\.)/g, '$1$2$3. ')
    // (optional) Fix bullets that lost a space: "-text" -> "- text"
    .replace(/(^|\n)(\s*)-([^\s-])/g, '$1$2- $3');
}

