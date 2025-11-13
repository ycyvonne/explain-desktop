import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { PluggableList } from 'unified';

export const MARKDOWN_REMARK_PLUGINS: PluggableList = [remarkGfm, remarkBreaks, remarkMath];
export const MARKDOWN_REHYPE_PLUGINS: PluggableList = [rehypeKatex];


