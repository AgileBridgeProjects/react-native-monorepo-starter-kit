'use client';

import { useTranslation } from '@lib/i18n';
import type { HtmlEditorRef } from 'devextreme-react/html-editor';
import HtmlEditor, {
  ImageUpload,
  Item,
  MediaResizing,
  Toolbar,
} from 'devextreme-react/html-editor';
import { forwardRef, memo, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RichTextEditorProps {
  /** Initial HTML value. */
  defaultValue?: string;
  /** React key to force remount. */
  editorKey?: string;
  /** Called when the editor value changes. */
  onValueChanged?: (e: { value?: string }) => void;
  /** Editor height in pixels, or `"auto"` to grow with content. */
  height?: number | string;
  /** Whether the editor is disabled. */
  disabled?: boolean;
  /** Placeholder text. */
  placeholder?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const RichTextEditorInner = forwardRef<HtmlEditorRef, RichTextEditorProps>(
  ({ defaultValue = '', editorKey, onValueChanged, height = 240, disabled, placeholder }, ref) => {
    const { t } = useTranslation();

    // Stabilise the callback reference so DevExtreme never sees onValueChanged
    // as a changed prop during normal parent re-renders. Without this, DevExtreme
    // calls widget.option('onValueChanged', newFn) on every render, which triggers
    // DevExtreme React to re-process its child configuration components (Toolbar,
    // Item, etc.) and rebuild the Quill instance — causing the cursor to reset
    // after every keystroke ("one character at a time" bug).
    const onValueChangedRef = useRef(onValueChanged);
    onValueChangedRef.current = onValueChanged;
    const stableOnValueChanged = useCallback((e: { value?: string }) => {
      onValueChangedRef.current?.(e);
    }, []);

    return (
      <HtmlEditor
        ref={ref}
        defaultValue={defaultValue}
        key={editorKey}
        onValueChanged={stableOnValueChanged}
        height={height}
        disabled={disabled}
        placeholder={placeholder}
        stylingMode="outlined"
      >
        {/* Essentials stay visible; secondary tools live in the overflow menu so the bar
            reads as four tight groups instead of a wall of icons. */}
        <Toolbar multiline={false}>
          <Item name="bold" options={{ hint: t('common:richTextEditor.bold') }} />
          <Item name="italic" options={{ hint: t('common:richTextEditor.italic') }} />
          <Item name="underline" options={{ hint: t('common:richTextEditor.underline') }} />
          <Item name="strike" options={{ hint: t('common:richTextEditor.strike') }} />
          <Item name="separator" />
          <Item name="bulletList" options={{ hint: t('common:richTextEditor.bulletList') }} />
          <Item name="orderedList" options={{ hint: t('common:richTextEditor.orderedList') }} />
          <Item name="separator" />
          <Item name="link" options={{ hint: t('common:richTextEditor.insertLink') }} />
          <Item name="image" options={{ hint: t('common:richTextEditor.insertImage') }} />
          <Item name="separator" />
          <Item
            name="header"
            acceptedValues={[1, 2, 3, false]}
            locateInMenu="auto"
            options={{ hint: t('common:richTextEditor.header') }}
          />
          <Item
            name="alignLeft"
            locateInMenu="always"
            options={{ hint: t('common:richTextEditor.alignLeft') }}
          />
          <Item
            name="alignCenter"
            locateInMenu="always"
            options={{ hint: t('common:richTextEditor.alignCenter') }}
          />
          <Item
            name="alignRight"
            locateInMenu="always"
            options={{ hint: t('common:richTextEditor.alignRight') }}
          />
          <Item
            name="color"
            locateInMenu="always"
            options={{ hint: t('common:richTextEditor.textColor') }}
          />
          <Item
            name="background"
            locateInMenu="always"
            options={{ hint: t('common:richTextEditor.backgroundColor') }}
          />
          <Item
            name="clear"
            locateInMenu="always"
            options={{ hint: t('common:richTextEditor.clearFormatting') }}
          />
          <Item
            name="undo"
            locateInMenu="always"
            options={{ hint: t('common:richTextEditor.undo') }}
          />
          <Item
            name="redo"
            locateInMenu="always"
            options={{ hint: t('common:richTextEditor.redo') }}
          />
        </Toolbar>
        <MediaResizing enabled={true} />
        <ImageUpload fileUploadMode="base64" tabs={['file']} />
      </HtmlEditor>
    );
  },
);

RichTextEditorInner.displayName = 'RichTextEditor';

// Skip re-renders that would cause DevExtreme to call widget.option() and
// trigger Quill to rebuild, resetting the cursor ("one char at a time" bug).
//
// defaultValue is intentionally excluded from this comparison — it is a
// one-time initial value and must never re-apply after mount. Callers that
// need to swap content entirely should change editorKey instead.
export const RichTextEditor = memo(
  RichTextEditorInner,
  (prev, next) =>
    prev.editorKey === next.editorKey &&
    prev.height === next.height &&
    prev.disabled === next.disabled &&
    prev.placeholder === next.placeholder,
);
