import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import ProtectedMarkdownImage from "./ProtectedMarkdownImage";
import ProtectedVideo from "./ProtectedVideo";
import CodeBlock from "./CodeBlock";
import { parseEmbed } from "@/lib/embed";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

// Flattens a rendered node back to plain text so the copy button gets the
// original source of the fenced block.
function nodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean")
    return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (React.isValidElement(node))
    return nodeText((node.props as { children?: React.ReactNode }).children);
  return "";
}

export default function MarkdownView({ content }: { content: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre: ({ children }) => {
            const code = React.Children.toArray(children).find(
              (c): c is React.ReactElement<{
                children?: React.ReactNode;
                className?: string;
              }> => React.isValidElement(c)
            );
            const language = /language-([\w-]+)/.exec(
              code?.props.className ?? ""
            )?.[1];
            return (
              <CodeBlock
                text={nodeText(code?.props.children ?? children).replace(
                  /\n$/,
                  ""
                )}
                language={language}
              />
            );
          },
          // `![](...)` handles video files and YouTube/Vimeo links too,
          // so the editor's insert buttons can use one syntax for all media.
          img: ({ src, alt }) => {
            const url = typeof src === "string" ? src : "";
            if (VIDEO_EXT.test(url)) {
              return <ProtectedVideo src={url} className="md-video" />;
            }
            const embed = parseEmbed(url);
            if (embed) {
              return (
                <span className="md-embed">
                  <iframe
                    src={embed.embedSrc}
                    title={alt || "Embedded video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </span>
              );
            }
            return <ProtectedMarkdownImage src={url} alt={alt ?? ""} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
