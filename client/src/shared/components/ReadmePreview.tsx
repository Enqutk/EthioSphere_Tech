import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  markdown: string;
  className?: string;
};

/** Renders GitHub-style README markdown (headings, lists, code, tables) — not raw `#` / `**` text. */
export function ReadmePreview({ markdown, className }: Props) {
  return (
    <div className={`readme-md ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
