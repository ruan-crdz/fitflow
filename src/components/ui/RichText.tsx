interface RichTextProps {
  text: string;
}

function normalizeMarkdown(text: string) {
  return text
    .replace(/\\([*_`])/g, '$1')
    .replace(/\*\*\s+\*\*([^*\n]+?)\*{4}/g, '**$1**')
    .replace(/\*\*\s+\*\*([^*\n]+?)\*\*/g, '**$1**')
    .replace(/\*\*\s+([^*\n]+?)\s+\*\*/g, (_match, content: string) => `**${content.trim()}**`)
    .replace(/\*\*([^*\n]+)$/g, '$1');
}

export function RichText({ text }: RichTextProps) {
  const lines = normalizeMarkdown(text).split('\n');

  return (
    <>
      {lines.map((line, lineIndex) => {
        const parts = line.split(/(\*\*[^*\n]+\*\*)/g);

        return (
          <span key={lineIndex}>
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={partIndex} className="font-bold text-white">{part.slice(2, -2).trim()}</strong>;
              }

              return <span key={partIndex}>{part}</span>;
            })}
            {lineIndex < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}
