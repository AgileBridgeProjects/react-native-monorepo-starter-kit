import { stripMarkdown } from '@lib/text/strip-markdown';
import { describe, expect, it } from 'vitest';

describe('stripMarkdown', () => {
  it('passes plain text through unchanged', () => {
    expect(stripMarkdown('Hello world')).toBe('Hello world');
  });

  it('returns an empty string for empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });

  it('strips a leading heading marker', () => {
    expect(stripMarkdown('# Title')).toBe('Title');
  });

  it('strips headings of every level (h1–h6)', () => {
    expect(stripMarkdown('###### Deep heading')).toBe('Deep heading');
    expect(stripMarkdown('### Mid')).toBe('Mid');
  });

  it('strips bold markers but keeps the inner text', () => {
    expect(stripMarkdown('This is **bold** text')).toBe('This is bold text');
  });

  it('strips italic markers but keeps the inner text', () => {
    expect(stripMarkdown('An _italic_ word')).toBe('An italic word');
  });

  it('strips bold-italic (triple emphasis) markers', () => {
    expect(stripMarkdown('***strong***')).toBe('strong');
  });

  it('keeps link text and drops the URL', () => {
    expect(stripMarkdown('See [the docs](https://example.com) here')).toBe('See the docs here');
  });

  it('removes images entirely (alt text and URL)', () => {
    expect(stripMarkdown('Before ![alt text](https://img.png) after')).toBe('Before after');
  });

  it('strips inline code backticks but keeps the code text', () => {
    expect(stripMarkdown('Run `npm test` now')).toBe('Run npm test now');
  });

  it('removes table rows and divider rows', () => {
    const table = ['| Col A | Col B |', '| --- | --- |', '| 1 | 2 |'].join('\n');
    expect(stripMarkdown(table)).toBe('');
  });

  it('strips unordered list bullets', () => {
    const list = ['- first', '- second', '- third'].join('\n');
    expect(stripMarkdown(list)).toBe('first second third');
  });

  it('collapses blank-line paragraph breaks into a single space', () => {
    expect(stripMarkdown('Para one.\n\nPara two.')).toBe('Para one. Para two.');
  });

  it('collapses runs of whitespace into single spaces and trims', () => {
    expect(stripMarkdown('  lots   of    space  ')).toBe('lots of space');
  });

  it('handles a combined document with mixed syntax', () => {
    const doc = [
      '# My Title',
      '',
      'A paragraph with **bold**, _italic_, and a [link](https://x.com).',
      '',
      '- bullet one',
      '- bullet two',
      '',
      'Inline `code` and an ![image](https://y.png).',
    ].join('\n');
    const result = stripMarkdown(doc);
    expect(result).not.toContain('#');
    expect(result).not.toContain('**');
    expect(result).not.toContain('](');
    expect(result).not.toContain('`');
    expect(result).toContain('My Title');
    expect(result).toContain('bold');
    expect(result).toContain('italic');
    expect(result).toContain('link');
    expect(result).toContain('bullet one');
    expect(result).toContain('code');
  });

  it('is idempotent on already-plain text', () => {
    const plain = stripMarkdown('# Heading\n\n**bold**');
    expect(stripMarkdown(plain)).toBe(plain);
  });
});
