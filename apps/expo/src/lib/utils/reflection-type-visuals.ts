import { palette } from '@/constants/tokens';

export interface ReflectionTypeVisual {
  icon: string;
  color: string;
}

/**
 * Leading icon and colour per reflection type — one definition shared by every surface that
 * lists mixed Survey/Homework/JournalPrompt items (the Reflect tab's assignment list and the
 * Create space's Coach-facing template lists), so type identity looks the same everywhere
 * rather than each screen picking its own icon for "this is homework".
 */
const REFLECTION_TYPE_VISUALS: Record<string, ReflectionTypeVisual> = {
  Survey: { icon: 'doc.text.fill', color: palette.cyan.DEFAULT },
  Homework: { icon: 'book.fill', color: palette.pink },
  JournalPrompt: { icon: 'pencil', color: palette.purple },
};

/** Falls back to the Survey visual for a type this build doesn't recognise (a newer server). */
export function reflectionTypeVisual(reflectionType: string): ReflectionTypeVisual {
  return REFLECTION_TYPE_VISUALS[reflectionType] ?? REFLECTION_TYPE_VISUALS.Survey;
}
