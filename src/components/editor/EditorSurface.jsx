import { EditorToolbar, FluxEditor } from './FluxEditor'

export function EditorSurface({
  activeDocumentKey,
  content,
  editorInstance,
  initialContent,
  onChange,
  onEditorReady,
  onMediaInserted,
}) {
  return (
    <>
      <EditorToolbar editor={editorInstance} />
      <FluxEditor
        key={activeDocumentKey}
        initialContent={initialContent ?? content}
        onEditorReady={onEditorReady}
        onChange={onChange}
        onMediaInserted={onMediaInserted}
      />
    </>
  )
}
