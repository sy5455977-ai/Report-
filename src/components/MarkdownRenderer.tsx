import React from 'react';

interface MarkdownRendererProps {
  content: string;
  theme?: 'dark' | 'light';
  className?: string;
}

// Clean any accidental leaked internal thought / reasoning chains
export function sanitizeAiText(raw: string): string {
  if (!raw) return '';
  let text = raw;

  // Remove leaked internal thought patterns like:
  // "User asks \"...\". They want..."
  // "User says \"...\". The user probably wants..."
  // "Thinking Process: ..."
  // "Internal Analysis: ..."
  text = text.replace(/^(?:User asks|User says|The user asks|The user says|The user probably wants|Thinking Process:|Internal Analysis:|Chain of thought:)[^\n]*\n+/gim, '');
  text = text.replace(/^(?:User asks|User says)[\s\S]*?(?:Let's provide|Here is|Answer:)\s*/i, '');
  
  // Also strip any residual leading "Answer:" or "Response:"
  text = text.replace(/^(?:Direct Answer|Answer|Response):\s*/i, '');

  return text.trim();
}

function parseInlineFormatting(text: string, theme: 'dark' | 'light' = 'dark'): React.ReactNode[] {
  // Regex to match code, bold, italic, bold-italic
  const tokenRegex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      const code = token.slice(1, -1);
      nodes.push(
        <code 
          key={match.index} 
          className={`px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${
            theme === 'light' ? 'bg-purple-100 text-purple-900' : 'bg-purple-950/70 text-purple-300 border border-purple-800/40'
          }`}
        >
          {code}
        </code>
      );
    } else if (token.startsWith('***') && token.endsWith('***')) {
      nodes.push(<strong key={match.index} className="font-bold italic">{token.slice(3, -3)}</strong>);
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={match.index} className={`font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(<em key={match.index} className="italic opacity-90">{token.slice(1, -1)}</em>);
    } else if (match[2] && match[3]) {
      // Link [text](url)
      nodes.push(
        <a 
          key={match.index} 
          href={match[3]} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-purple-400 hover:text-purple-300 underline font-medium"
        >
          {match[2]}
        </a>
      );
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function MarkdownRenderer({ content, theme = 'dark', className = '' }: MarkdownRendererProps) {
  const cleanContent = sanitizeAiText(content);
  if (!cleanContent) return null;

  const lines = cleanContent.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Empty line
    if (!trimmed) {
      elements.push(<div key={`spacer-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // 2. Code Block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const fullCode = codeLines.join('\n');
      elements.push(
        <div key={`code-${i}`} className="my-3 rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-md">
          {lang && (
            <div className="px-3.5 py-1.5 bg-white/5 border-b border-white/10 text-[11px] font-mono font-semibold text-gray-400 uppercase tracking-wider">
              {lang}
            </div>
          )}
          <pre className="p-3.5 text-xs font-mono overflow-x-auto text-emerald-300 leading-relaxed [scrollbar-width:thin]">
            <code>{fullCode}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 3. Markdown Table (detect lines with | ... |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
        const hasSeparator = tableLines[1].replace(/[-:\s|]/g, '').length === 0;
        const dataRows = (hasSeparator ? tableLines.slice(2) : tableLines.slice(1)).map(row => 
          row.split('|').slice(1, -1).map(c => c.trim())
        );

        elements.push(
          <div key={`table-${i}`} className="my-3.5 w-full overflow-x-auto rounded-xl border border-white/10 shadow-md [scrollbar-width:thin]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={theme === 'light' ? 'bg-purple-50 text-purple-950 font-bold border-b border-purple-200' : 'bg-purple-950/40 text-purple-200 font-bold border-b border-purple-800/40'}>
                  {headerRow.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2.5 font-bold uppercase tracking-wider text-[11px]">
                      {parseInlineFormatting(h, theme)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dataRows.map((row, rIdx) => (
                  <tr 
                    key={rIdx} 
                    className={`${rIdx % 2 === 0 ? (theme === 'light' ? 'bg-white' : 'bg-black/20') : (theme === 'light' ? 'bg-gray-50/70' : 'bg-white/[0.02]')} hover:bg-purple-500/10 transition-colors`}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-xs leading-relaxed">
                        {parseInlineFormatting(cell, theme)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 4. Headings (#, ##, ###, ####)
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];
        if (level === 1) {
          elements.push(
            <h1 key={`h1-${i}`} className="text-[18px] font-bold text-purple-400 mt-4 mb-2 tracking-tight leading-[1.3]">
              {parseInlineFormatting(headingText, theme)}
            </h1>
          );
        } else if (level === 2) {
          elements.push(
            <h2 key={`h2-${i}`} className="text-[16px] font-bold text-purple-300 mt-3.5 mb-1.5 tracking-tight border-b border-white/10 pb-1 leading-[1.4]">
              {parseInlineFormatting(headingText, theme)}
            </h2>
          );
        } else {
          elements.push(
            <h3 key={`h3-${i}`} className="text-[16px] font-bold text-purple-200 mt-3 mb-1 leading-[1.4]">
              {parseInlineFormatting(headingText, theme)}
            </h3>
          );
        }
        i++;
        continue;
      }
    }

    // 5. Standalone Title / Bold Heading without # (e.g. "Internet Kya Hai?" or "**Internet Ke Uses**")
    if (
      (trimmed.endsWith('?') || trimmed.startsWith('**') && trimmed.endsWith('**')) &&
      trimmed.length < 70 &&
      !trimmed.includes('\n') &&
      !trimmed.startsWith('-') &&
      !trimmed.startsWith('* ') &&
      !/^\d+[\.\)]/.test(trimmed)
    ) {
      const cleanHeader = trimmed.replace(/^\*\*|\*\*$/g, '');
      // Check if next line is not a simple continuation
      const nextLine = lines[i + 1]?.trim() || '';
      if (!nextLine || nextLine.startsWith('-') || nextLine.startsWith('*') || /^\d+[\.\)]/.test(nextLine) || lines.length <= 4) {
        elements.push(
          <div key={`title-head-${i}`} className="text-[16px] font-bold text-purple-300 mt-3 mb-1.5 flex items-center gap-1.5 leading-[1.4]">
            <span>{parseInlineFormatting(cleanHeader, theme)}</span>
          </div>
        );
        i++;
        continue;
      }
    }

    // 6. Numbered List item: "1. Item" or "1) Item"
    const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)$/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const itemText = numberedMatch[2];
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5 pl-1 text-[14px] leading-[1.7]">
          <span className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-md text-[11px] font-bold mt-1 shrink-0 ${
            theme === 'light' ? 'bg-purple-100 text-purple-800' : 'bg-purple-950/80 text-purple-300 border border-purple-800/40'
          }`}>
            {num}
          </span>
          <div className="flex-1 text-[14px] leading-[1.7]">
            {parseInlineFormatting(itemText, theme)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 7. Bullet List item: "- Item" or "* Item" or "• Item"
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      const itemText = bulletMatch[1];
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2.5 my-1 pl-1 text-[14px] leading-[1.7]">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2.5 flex-shrink-0" />
          <div className="flex-1 text-[14px] leading-[1.7]">
            {parseInlineFormatting(itemText, theme)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 8. Conclusion label styling (e.g., "Conclusion:" or "निष्कर्ष:")
    if (/^(?:Conclusion|Summary|निष्कर्ष|Saaransh):\s*(.+)?/i.test(trimmed)) {
      const cMatch = trimmed.match(/^(?:Conclusion|Summary|निष्कर्ष|Saaransh):\s*(.+)?/i);
      const conclusionBody = cMatch?.[1] || '';
      elements.push(
        <div 
          key={`conclusion-${i}`} 
          className={`my-3 p-3.5 rounded-xl border ${
            theme === 'light' 
              ? 'bg-purple-50/70 border-purple-200 text-purple-950' 
              : 'bg-purple-950/30 border-purple-800/40 text-purple-100'
          }`}
        >
          <div className="font-bold text-[13px] uppercase tracking-wider text-purple-400 mb-1">
            Conclusion
          </div>
          <div className="text-[14px] font-medium leading-[1.7]">
            {conclusionBody ? parseInlineFormatting(conclusionBody, theme) : null}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 9. Standard paragraph line
    elements.push(
      <p key={`p-${i}`} className="my-1.5 text-[14px] leading-[1.7]">
        {parseInlineFormatting(trimmed, theme)}
      </p>
    );
    i++;
  }

  return (
    <div className={`markdown-content flex flex-col ${className}`}>
      {elements}
    </div>
  );
}
