import type { ReactNode } from 'react'

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${cursor}`}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<code key={`${keyPrefix}-c${cursor}`} className="chat-inline-code">{token.slice(1, -1)}</code>)
    }
    cursor = match.index + token.length
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

export function renderMarkdown(content: string): ReactNode[] {
  const blocks: ReactNode[] = []
  let listBuffer: string[] = []
  let codeBlockBuffer: string[] = []
  let inCodeBlock = false
  let codeBlockLang = ''

  const flushList = () => {
    if (listBuffer.length === 0) return
    const items = listBuffer.map((item, index) => (
      <li key={`li-${index}`}>{renderInline(item, `li-${index}`)}</li>
    ))
    blocks.push(<ul key={`ul-${blocks.length}`}>{items}</ul>)
    listBuffer = []
  }

  const flushCodeBlock = (key: string) => {
    if (codeBlockBuffer.length === 0 && !inCodeBlock) return
    const code = codeBlockBuffer.join('\n')
    blocks.push(
      <div key={key} className="chat-code-block-wrapper my-[8px] rounded-[6px] overflow-hidden border border-[#dce4d9] dark:border-[#2f3e34] bg-[#f4f6f2] dark:bg-[#16201b]">
        {codeBlockLang && (
          <div className="chat-code-block-header px-[10px] py-[3px] text-[10px] font-mono uppercase tracking-[0.06em] text-[#637569] dark:text-[#8e9f93] bg-[#ebf0e8] dark:bg-[#1c2822] border-b border-[#dce4d9] dark:border-[#2f3e34]">
            {codeBlockLang}
          </div>
        )}
        <pre className="chat-code-block m-0 p-[10px_12px] overflow-x-auto text-[11.5px] leading-[1.5] font-mono text-[#1c352b] dark:text-[#e4eee6]">
          <code>{code}</code>
        </pre>
      </div>
    )
    codeBlockBuffer = []
    inCodeBlock = false
    codeBlockLang = ''
  }

  const lines = content.split('\n')
  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      flushList()
      if (inCodeBlock) {
        flushCodeBlock(`cb-${index}`)
      } else {
        inCodeBlock = true
        codeBlockLang = trimmed.slice(3).trim()
      }
      return
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line)
      return
    }

    if (/^[-*]\s+/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^[-*]\s+/, ''))
      return
    }
    flushList()
    if (!trimmed) return
    if (/^#{1,3}\s+/.test(trimmed)) {
      blocks.push(<h4 key={`h-${index}`}>{renderInline(trimmed.replace(/^#{1,3}\s+/, ''), `h-${index}`)}</h4>)
      return
    }
    blocks.push(<p key={`p-${index}`}>{renderInline(trimmed, `p-${index}`)}</p>)
  })
  flushList()
  if (inCodeBlock) {
    flushCodeBlock('cb-end')
  }
  return blocks
}