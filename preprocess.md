1) Easiest: pre-process the text before rendering

Merge “orphaned” list markers with the next line.

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks"; // optional but helpful for line breaks

function normalizeMd(md: string) {
  return md
    // Join lines that are only "1." / "2." etc. with the following line.
    .replace(/(^|\n)(\s*)(\d+)\.\s*\n(?!\s*[-*+]|\s*\d+\.)/g, "$1$2$3. ")
    // (optional) Fix bullets that lost a space: "-text" -> "- text"
    .replace(/(^|\n)(\s*)-([^\s-])/g, "$1$2- $3");
}

export function ChatContent({ content }: { content: string }) {
  return (
    <div className="chat-content prose prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {normalizeMd(content)}
      </ReactMarkdown>
    </div>
  );
}


Install the extra plugin if you want single newlines to render as <br> inside paragraphs:

npm i remark-breaks