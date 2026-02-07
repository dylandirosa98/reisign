'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface DocumentRichEditorProps {
  htmlContent: string
  onSave: (html: string) => void
  onCancel: () => void
}

export function DocumentRichEditor({
  htmlContent,
  onSave,
  onCancel,
}: DocumentRichEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(800)
  const originalHtmlRef = useRef(htmlContent) // Keep original to preserve head/styles

  const setupIframe = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const doc = iframe.contentDocument
    if (!doc) return

    // Add contenteditable styles
    const editableStyles = `
      <style>
        body {
          cursor: text;
        }
        body:focus {
          outline: none;
        }
        /* Highlight editable text on hover */
        p:hover, span:hover, div:hover, td:hover, li:hover, h1:hover, h2:hover, h3:hover, h4:hover, h5:hover, h6:hover {
          background-color: rgba(59, 130, 246, 0.05);
        }
        /* Show focus state */
        *:focus {
          outline: 2px solid rgba(59, 130, 246, 0.3);
          outline-offset: 2px;
        }
        /* Style for input fields that are already in the template */
        input, select, textarea {
          pointer-events: auto;
        }
        /* Style for placeholder fields - make them visually distinct and non-editable */
        .template-placeholder {
          background: rgba(59, 130, 246, 0.15);
          border-radius: 3px;
          padding: 1px 4px;
          color: #1d4ed8;
          font-weight: 500;
          cursor: not-allowed;
        }
      </style>
    `

    // Wrap {{placeholders}} in non-editable spans so they're preserved
    let processedHtml = htmlContent
    // Handle field-line wrapped placeholders
    processedHtml = processedHtml.replace(
      /(<span class="field-line[^"]*">)\s*(\{\{[^}]+\}\})\s*(<\/span>)/g,
      (_, before, placeholder, after) => {
        const label = placeholder.replace(/\{\{|\}\}/g, '').replace(/_/g, ' ')
        return `${before}<span class="template-placeholder" contenteditable="false" title="Edit this in regular Edit mode">${label}</span>${after}`
      }
    )
    // Handle standalone {{placeholders}}
    processedHtml = processedHtml.replace(
      /\{\{([^}#/]+)\}\}/g,
      (match, key) => {
        const trimmedKey = key.trim()
        if (trimmedKey.endsWith('_check')) return match // Skip checkbox placeholders
        const label = trimmedKey.replace(/_/g, ' ')
        return `<span class="template-placeholder" contenteditable="false" title="Edit this in regular Edit mode">${label}</span>`
      }
    )

    // Check if the HTML is a full document or just body content
    const isFullDocument = processedHtml.includes('<html') || processedHtml.includes('<!DOCTYPE')

    let finalHtml: string
    if (isFullDocument) {
      // Insert styles into the head
      finalHtml = processedHtml.replace('</head>', `${editableStyles}</head>`)
      // Add contenteditable to body
      finalHtml = finalHtml.replace(/<body([^>]*)>/, '<body$1 contenteditable="true">')
    } else {
      // Wrap in a full HTML document
      finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          ${editableStyles}
        </head>
        <body contenteditable="true" style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; margin: 0;">
          ${processedHtml}
        </body>
        </html>
      `
    }

    doc.open()
    doc.write(finalHtml)
    doc.close()

    // Set up height observer
    const updateHeight = () => {
      if (doc.body) {
        const newHeight = Math.max(doc.body.scrollHeight + 40, 400)
        setIframeHeight(newHeight)
      }
    }

    // Initial height
    updateHeight()

    // Watch for content changes
    const observer = new MutationObserver(updateHeight)
    if (doc.body) {
      observer.observe(doc.body, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }

    // Also resize on window resize
    const resizeObserver = new ResizeObserver(updateHeight)
    if (doc.body) {
      resizeObserver.observe(doc.body)
    }

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
    }
  }, [htmlContent])

  useEffect(() => {
    // Small delay to ensure iframe is mounted
    const timer = setTimeout(setupIframe, 50)
    return () => clearTimeout(timer)
  }, [setupIframe])

  const handleSave = () => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument?.body) return

    // Get the edited body content
    const editedBody = iframe.contentDocument.body.innerHTML

    // Reconstruct full HTML with original head/styles but new body content
    const original = originalHtmlRef.current
    const isFullDocument = original.includes('<html') || original.includes('<!DOCTYPE')

    let finalHtml: string
    if (isFullDocument) {
      // Replace body content in original HTML, preserving head/styles
      finalHtml = original.replace(
        /(<body[^>]*>)([\s\S]*?)(<\/body>)/i,
        `$1${editedBody}$3`
      )
    } else {
      // Original was just body content, return edited body
      finalHtml = editedBody
    }

    onSave(finalHtml)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-lg px-3 py-2 sticky top-0 z-10">
        <p className="text-sm text-[var(--gray-600)]">
          Click anywhere to edit text directly
        </p>

        <div className="flex items-center gap-2">
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            className="text-xs bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
          >
            Save Document
          </Button>
        </div>
      </div>

      {/* Document Editor */}
      <div className="border border-[var(--gray-200)] rounded bg-white overflow-hidden">
        <iframe
          ref={iframeRef}
          title="Document Editor"
          className="w-full border-0"
          style={{ height: `${iframeHeight}px`, minHeight: '600px' }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  )
}
