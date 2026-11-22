import FormatBoldOutlined from '@mui/icons-material/FormatBoldOutlined'
import FormatItalicOutlined from '@mui/icons-material/FormatItalicOutlined'
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined'
import FormatListNumberedOutlined from '@mui/icons-material/FormatListNumberedOutlined'
import InsertLinkOutlined from '@mui/icons-material/InsertLinkOutlined'
import TitleOutlined from '@mui/icons-material/TitleOutlined'
import { Box, Divider, FormHelperText, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { ReactNode } from 'react'
import { tokens } from '../theme'

/**
 * A rich text field (TipTap) for HTML descriptions: bold, italic, a
 * sub-heading, lists and links, nothing else.
 *
 * The editor only keeps what its extensions know: a <script>, a style or an
 * onclick pasted in is dropped, and so is one already in a stored
 * description, from the moment that description is edited. What the editor
 * gives back is therefore clean HTML.
 *
 * `value` is only read when the field mounts: give the field a `key` to load
 * another text.
 *
 * @param onChange the HTML, or '' when the field is empty
 */
export function RichTextEditor({ label, value, onChange, error, helperText }: {
  label: string
  value: string
  onChange: (html: string) => void
  error?: boolean
  helperText?: ReactNode
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        // Un clic dans l'editeur doit placer le curseur, pas ouvrir le lien.
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['http', 'https', 'mailto'] },
      }),
    ],
    content: value,
    editorProps: {
      attributes: { 'aria-label': label, 'aria-multiline': 'true', role: 'textbox', class: 'rich-text' },
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? '' : current.getHTML()),
  })

  return (
    <Stack spacing={0.75}>
      <Typography component="label" variant="body2" sx={{ fontWeight: 600 }} color={error ? 'error' : 'text.primary'}>
        {label}
      </Typography>
      <Box
        sx={{
          border: 1, borderColor: error ? 'error.main' : tokens.lineStrong, borderRadius: 1, bgcolor: 'background.paper',
          '&:focus-within': { borderColor: error ? 'error.main' : 'primary.main', boxShadow: `0 0 0 1px ${error ? tokens.danger : tokens.accent}` },
        }}
      >
        {editor && <Toolbar editor={editor} />}
        <Divider />
        <Box
          sx={{
            '& .rich-text': { minHeight: 180, px: 2, py: 1.5, outline: 'none', fontSize: 15, lineHeight: 1.6 },
            '& .rich-text p': { my: 1 },
            '& .rich-text h3': { fontSize: 17, fontWeight: 800, mt: 2, mb: 1 },
            '& .rich-text a': { color: 'primary.main' },
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>
      {helperText && <FormHelperText error={error} sx={{ mx: 0 }}>{helperText}</FormHelperText>}
    </Stack>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      heading: current.isActive('heading', { level: 3 }),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      link: current.isActive('link'),
    }),
  })

  function editLink() {
    const current = editor.getAttributes('link').href as string | undefined
    // Une boite de saisie du navigateur suffit ici : un seul champ, et Echap annule.
    const href = window.prompt('Adresse du lien (laisser vide pour le retirer)', current ?? 'https://')
    if (href === null) return
    if (!href.trim() || href.trim() === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run()
    }
  }

  const buttons = [
    { label: 'Gras', icon: <FormatBoldOutlined />, pressed: active.bold, run: () => editor.chain().focus().toggleBold().run() },
    { label: 'Italique', icon: <FormatItalicOutlined />, pressed: active.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: 'Intertitre', icon: <TitleOutlined />, pressed: active.heading, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Liste à puces', icon: <FormatListBulletedOutlined />, pressed: active.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Liste numérotée', icon: <FormatListNumberedOutlined />, pressed: active.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Lien', icon: <InsertLinkOutlined />, pressed: active.link, run: editLink },
  ]

  return (
    <Stack direction="row" spacing={0.5} role="toolbar" aria-label="Mise en forme" sx={{ px: 1, py: 0.5, flexWrap: 'wrap' }}>
      {buttons.map((button) => (
        <Tooltip key={button.label} title={button.label}>
          <IconButton
            size="small"
            aria-label={button.label}
            aria-pressed={button.pressed}
            onClick={button.run}
            sx={button.pressed ? { bgcolor: tokens.canvasWarm, color: 'primary.main' } : undefined}
          >
            {button.icon}
          </IconButton>
        </Tooltip>
      ))}
    </Stack>
  )
}
