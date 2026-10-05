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
      nodes.push(<code key={`${keyPrefix}-c${cursor}`}>{token.slice(1, -1)}</code>)
    }
    cursor = match.index + token.length
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

export function renderMarkdown(content: string): ReactNode[] {
  const blocks: ReactNode[] = []
  let listBuffer: string[] = []

  const flushList = () => {
    if (listBuffer.length === 0) return
    const items = listBuffer.map((item, index) => (
      <li key={`li-${index}`}>{renderInline(item, `li-${index}`)}</li>
    ))
    blocks.push(<ul key={`ul-${blocks.length}`}>{items}</ul>)
    listBuffer = []
  }

  content.split('\n').forEach((line, index) => {
    const trimmed = line.trim()
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
  return blocks
}