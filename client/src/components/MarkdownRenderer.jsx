import React, { useState } from 'react';

/**
 * High-performance, secure syntax highlighter for Java, Python, JavaScript, and other languages.
 * Tokenizes code into React elements with no dangerous innerHTML.
 */
const JAVA_KEYWORDS = new Set([
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
    'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final',
    'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int',
    'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public',
    'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this',
    'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'record', 'sealed',
    'permits', 'var', 'yield',
    // Python / JS keywords for cross-language support
    'def', 'elif', 'lambda', 'pass', 'raise', 'with', 'from', 'as', 'function', 'let', 'typeof'
]);

const JAVA_TYPES = new Set([
    'String', 'Integer', 'Double', 'Float', 'Long', 'Short', 'Byte', 'Character', 'Boolean',
    'Object', 'Class', 'System', 'Scanner', 'Math', 'Thread', 'Runnable', 'List', 'ArrayList',
    'LinkedList', 'Map', 'HashMap', 'TreeMap', 'Set', 'HashSet', 'TreeSet', 'Arrays',
    'Collections', 'Queue', 'Stack', 'Exception', 'Throwable', 'RuntimeException',
    'IOException', 'NullPointerException', 'StringBuilder', 'StringBuffer', 'PrintStream',
    'File', 'Path', 'Files', 'Comparable', 'Comparator', 'Optional',
    // Python / JS common built-ins
    'list', 'dict', 'set', 'tuple', 'str', 'int', 'float', 'bool', 'print', 'len', 'range',
    'Promise', 'Array', 'console', 'JSON'
]);

const HIGHLIGHT_THEME = {
    keyword: '#c678dd',     // Vibrant purple
    type: '#e5c07b',        // Warm gold/yellow
    string: '#98c379',      // Soft emerald green
    number: '#d19a66',      // Warm orange
    comment: '#7f848e',     // Italic muted gray
    annotation: '#61afef',  // Light blue
    method: '#61afef',      // Sky blue
    punctuation: '#abb2bf', // Off-white
    plain: '#abb2bf'
};

function highlightCode(code, language = 'java') {
    const tokens = [];
    let i = 0;
    const len = code.length;

    while (i < len) {
        // Multi-line comment /* ... */
        if (code[i] === '/' && code[i + 1] === '*') {
            const start = i;
            i += 2;
            while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
                i++;
            }
            i = Math.min(len, i + 2);
            tokens.push({ type: 'comment', value: code.slice(start, i) });
            continue;
        }

        // Single-line comment // ... or # ...
        if ((code[i] === '/' && code[i + 1] === '/') || (code[i] === '#' && language.toLowerCase().includes('py'))) {
            const start = i;
            while (i < len && code[i] !== '\n') {
                i++;
            }
            tokens.push({ type: 'comment', value: code.slice(start, i) });
            continue;
        }

        // Strings "..." or '...' or `...`
        if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
            const quote = code[i];
            const start = i;
            i++;
            while (i < len && code[i] !== quote) {
                if (code[i] === '\\' && i + 1 < len) {
                    i += 2;
                } else {
                    i++;
                }
            }
            if (i < len) i++;
            tokens.push({ type: 'string', value: code.slice(start, i) });
            continue;
        }

        // Annotation e.g. @Override, @Deprecated
        if (code[i] === '@' && /[a-zA-Z_]/.test(code[i + 1] || '')) {
            const start = i;
            i++;
            while (i < len && /[a-zA-Z0-9_]/.test(code[i])) {
                i++;
            }
            tokens.push({ type: 'annotation', value: code.slice(start, i) });
            continue;
        }

        // Numbers: e.g. 100, 3.14, 0xFF, 10L, 5.0f
        if (/\d/.test(code[i]) || (code[i] === '.' && /\d/.test(code[i + 1] || ''))) {
            const start = i;
            while (i < len && /[0-9a-fA-FxX_.]/.test(code[i])) {
                i++;
            }
            if (i < len && /[fFdDlL]/.test(code[i])) {
                i++;
            }
            tokens.push({ type: 'number', value: code.slice(start, i) });
            continue;
        }

        // Identifiers: keywords, types, methods, words
        if (/[a-zA-Z_$]/.test(code[i])) {
            const start = i;
            while (i < len && /[a-zA-Z0-9_$]/.test(code[i])) {
                i++;
            }
            const word = code.slice(start, i);

            // Look ahead for method call: word(
            let j = i;
            while (j < len && /\s/.test(code[j])) j++;
            const isMethod = code[j] === '(';

            if (JAVA_KEYWORDS.has(word)) {
                tokens.push({ type: 'keyword', value: word });
            } else if (JAVA_TYPES.has(word) || /^[A-Z][a-zA-Z0-9_$]*$/.test(word)) {
                tokens.push({ type: 'type', value: word });
            } else if (isMethod) {
                tokens.push({ type: 'method', value: word });
            } else {
                tokens.push({ type: 'plain', value: word });
            }
            continue;
        }

        // Standard punctuation / whitespace
        tokens.push({ type: 'plain', value: code[i] });
        i++;
    }

    return tokens.map((tok, idx) => {
        const color = HIGHLIGHT_THEME[tok.type] || HIGHLIGHT_THEME.plain;
        const fontStyle = tok.type === 'comment' ? 'italic' : 'normal';
        const fontWeight = tok.type === 'keyword' || tok.type === 'type' ? '600' : 'normal';
        return (
            <span key={idx} style={{ color, fontStyle, fontWeight }}>
                {tok.value}
            </span>
        );
    });
}

/**
 * Code Block Component with Language Badge and Copy Button
 */
function CodeBlock({ language = 'java', code = '' }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
    };

    const displayLang = (language || 'code').toUpperCase();

    return (
        <div style={{
            margin: '14px 0',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #313244',
            backgroundColor: '#181825',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
        }}>
            {/* Header bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                background: '#11111b',
                borderBottom: '1px solid #313244'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f38ba8' }} />
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f9e2af' }} />
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#a6e3a1' }} />
                    </div>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#cdd6f4',
                        letterSpacing: '0.06em',
                        marginLeft: '4px'
                    }}>
                        {displayLang}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                        background: copied ? '#22c55e' : 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {copied ? '✓ Copied!' : '📋 Copy code'}
                </button>
            </div>

            {/* Code content */}
            <pre style={{
                margin: 0,
                padding: '14px 16px',
                fontSize: '13px',
                lineHeight: '1.6',
                overflowX: 'auto',
                color: '#cdd6f4',
                background: '#181825',
                whiteSpace: 'pre',
                tabSize: 4
            }}>
                <code>{highlightCode(code, language)}</code>
            </pre>
        </div>
    );
}

/**
 * Parse inline Markdown elements: bold, italic, inline code, links
 */
function renderInline(text, keyPrefix = '') {
    if (!text) return null;

    // Pattern matches:
    // 1: `code`
    // 2: **bold** or __bold__
    // 3: *italic* or _italic_
    // 4: [text](url)
    const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)|\[[^\]]+\]\([^)]+\))/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, index) => {
        const key = `${keyPrefix}-${index}`;
        if (!part) return null;

        // Inline code `...`
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
            return (
                <code
                    key={key}
                    style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#059669',
                        padding: '2px 6px',
                        borderRadius: '5px',
                        fontSize: '0.9em',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontWeight: '600',
                        border: '1px solid rgba(16, 185, 129, 0.25)'
                    }}
                >
                    {part.slice(1, -1)}
                </code>
            );
        }

        // Bold **...** or __...__
        if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
            (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
            return (
                <strong key={key} style={{ fontWeight: '700', color: 'inherit' }}>
                    {renderInline(part.slice(2, -2), `${key}-b`)}
                </strong>
            );
        }

        // Italic *...* or _..._
        if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
            (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
            return (
                <em key={key} style={{ fontStyle: 'italic', color: 'inherit' }}>
                    {renderInline(part.slice(1, -1), `${key}-i`)}
                </em>
            );
        }

        // Link [title](url)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
            return (
                <a
                    key={key}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                        color: '#10b981',
                        textDecoration: 'underline',
                        fontWeight: '600'
                    }}
                >
                    {linkMatch[1]}
                </a>
            );
        }

        return part;
    });
}

/**
 * Main Markdown Renderer Component
 */
export default function MarkdownRenderer({ content = '', isDark = false }) {
    if (!content || typeof content !== 'string') {
        return null;
    }

    // Split text into blocks: code fences vs normal lines
    const blocks = [];
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines = [];
    let currentTextBlock = [];

    const flushTextBlock = () => {
        if (currentTextBlock.length > 0) {
            blocks.push({ type: 'text', lines: [...currentTextBlock] });
            currentTextBlock = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('```')) {
            if (inCodeBlock) {
                // End code block
                blocks.push({
                    type: 'code',
                    language: codeLanguage,
                    code: codeLines.join('\n')
                });
                codeLines = [];
                codeLanguage = '';
                inCodeBlock = false;
            } else {
                // Start code block
                flushTextBlock();
                inCodeBlock = true;
                codeLanguage = trimmed.slice(3).trim() || 'java';
                codeLines = [];
            }
            continue;
        }

        if (inCodeBlock) {
            codeLines.push(line);
        } else {
            currentTextBlock.push(line);
        }
    }

    // Handle open code block that didn't close with ```
    if (inCodeBlock && codeLines.length > 0) {
        blocks.push({
            type: 'code',
            language: codeLanguage || 'java',
            code: codeLines.join('\n')
        });
    } else {
        flushTextBlock();
    }

    return (
        <div style={{
            fontSize: '14px',
            lineHeight: '1.65',
            color: 'inherit',
            wordBreak: 'break-word',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>
            {blocks.map((block, blockIdx) => {
                if (block.type === 'code') {
                    return (
                        <CodeBlock
                            key={`block-${blockIdx}`}
                            language={block.language}
                            code={block.code}
                        />
                    );
                }

                // Parse standard markdown text block lines (headings, quotes, lists, paragraphs)
                return (
                    <RenderTextLines
                        key={`block-${blockIdx}`}
                        lines={block.lines}
                        blockIdx={blockIdx}
                    />
                );
            })}
        </div>
    );
}

/**
 * Helper to render markdown text lines: headings, quotes, lists, paragraphs
 */
function RenderTextLines({ lines, blockIdx }) {
    const elements = [];
    let currentList = null; // { type: 'ul' | 'ol', items: [] }
    let currentQuote = null; // string[]

    const flushList = (key) => {
        if (currentList) {
            if (currentList.type === 'ul') {
                elements.push(
                    <ul
                        key={key}
                        style={{
                            margin: '8px 0',
                            paddingLeft: '22px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}
                    >
                        {currentList.items.map((item, idx) => (
                            <li key={idx} style={{ lineHeight: '1.55' }}>
                                {renderInline(item, `${key}-li-${idx}`)}
                            </li>
                        ))}
                    </ul>
                );
            } else {
                elements.push(
                    <ol
                        key={key}
                        style={{
                            margin: '8px 0',
                            paddingLeft: '22px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}
                    >
                        {currentList.items.map((item, idx) => (
                            <li key={idx} style={{ lineHeight: '1.55' }}>
                                {renderInline(item, `${key}-li-${idx}`)}
                            </li>
                        ))}
                    </ol>
                );
            }
            currentList = null;
        }
    };

    const flushQuote = (key) => {
        if (currentQuote && currentQuote.length > 0) {
            elements.push(
                <blockquote
                    key={key}
                    style={{
                        margin: '10px 0',
                        padding: '10px 14px',
                        borderLeft: '4px solid #10b981',
                        background: 'rgba(16, 185, 129, 0.08)',
                        borderRadius: '0 8px 8px 0',
                        fontStyle: 'normal',
                        fontSize: '13.5px',
                        color: 'inherit',
                        lineHeight: '1.55'
                    }}
                >
                    {currentQuote.map((qLine, qIdx) => (
                        <div key={qIdx} style={{ marginBottom: qIdx === currentQuote.length - 1 ? 0 : '4px' }}>
                            {renderInline(qLine, `${key}-q-${qIdx}`)}
                        </div>
                    ))}
                </blockquote>
            );
            currentQuote = null;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Empty line -> flush active groupings
        if (!trimmed) {
            flushList(`list-${blockIdx}-${i}`);
            flushQuote(`quote-${blockIdx}-${i}`);
            continue;
        }

        // Horizontal rule
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
            flushList(`list-${blockIdx}-${i}`);
            flushQuote(`quote-${blockIdx}-${i}`);
            elements.push(
                <hr
                    key={`hr-${blockIdx}-${i}`}
                    style={{
                        border: 'none',
                        borderTop: '1px solid rgba(0,0,0,0.1)',
                        margin: '12px 0'
                    }}
                />
            );
            continue;
        }

        // Headings: ###, ##, #
        if (trimmed.startsWith('#')) {
            flushList(`list-${blockIdx}-${i}`);
            flushQuote(`quote-${blockIdx}-${i}`);

            const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const headingText = headingMatch[2];

                if (level === 1) {
                    elements.push(
                        <h1
                            key={`h1-${blockIdx}-${i}`}
                            style={{
                                fontSize: '18px',
                                fontWeight: '800',
                                margin: '14px 0 6px',
                                color: 'inherit',
                                lineHeight: '1.3'
                            }}
                        >
                            {renderInline(headingText, `h1-${blockIdx}-${i}`)}
                        </h1>
                    );
                } else if (level === 2) {
                    elements.push(
                        <h2
                            key={`h2-${blockIdx}-${i}`}
                            style={{
                                fontSize: '16px',
                                fontWeight: '700',
                                margin: '12px 0 6px',
                                color: 'inherit',
                                lineHeight: '1.35'
                            }}
                        >
                            {renderInline(headingText, `h2-${blockIdx}-${i}`)}
                        </h2>
                    );
                } else {
                    elements.push(
                        <h3
                            key={`h3-${blockIdx}-${i}`}
                            style={{
                                fontSize: '14.5px',
                                fontWeight: '700',
                                margin: '10px 0 4px',
                                color: 'inherit',
                                lineHeight: '1.4'
                            }}
                        >
                            {renderInline(headingText, `h3-${blockIdx}-${i}`)}
                        </h3>
                    );
                }
                continue;
            }
        }

        // Blockquote: > ...
        if (trimmed.startsWith('>')) {
            flushList(`list-${blockIdx}-${i}`);
            const quoteContent = trimmed.replace(/^>\s?/, '');
            if (!currentQuote) currentQuote = [];
            currentQuote.push(quoteContent);
            continue;
        } else {
            flushQuote(`quote-${blockIdx}-${i}`);
        }

        // Unordered List: - item, * item, • item
        const ulMatch = trimmed.match(/^[-*•]\s+(.+)$/);
        if (ulMatch) {
            if (currentList && currentList.type !== 'ul') {
                flushList(`list-${blockIdx}-${i}`);
            }
            if (!currentList) {
                currentList = { type: 'ul', items: [] };
            }
            currentList.items.push(ulMatch[1]);
            continue;
        }

        // Ordered List: 1. item, 2. item
        const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
        if (olMatch) {
            if (currentList && currentList.type !== 'ol') {
                flushList(`list-${blockIdx}-${i}`);
            }
            if (!currentList) {
                currentList = { type: 'ol', items: [] };
            }
            currentList.items.push(olMatch[1]);
            continue;
        }

        // Standard Paragraph text line
        flushList(`list-${blockIdx}-${i}`);
        flushQuote(`quote-${blockIdx}-${i}`);

        elements.push(
            <p
                key={`p-${blockIdx}-${i}`}
                style={{
                    margin: '4px 0',
                    lineHeight: '1.6'
                }}
            >
                {renderInline(line, `p-${blockIdx}-${i}`)}
            </p>
        );
    }

    flushList(`list-final-${blockIdx}`);
    flushQuote(`quote-final-${blockIdx}`);

    return <>{elements}</>;
}
