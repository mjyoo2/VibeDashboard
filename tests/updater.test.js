import { describe, it, expect } from 'vitest';
import {
  findMarkers,
  insertContent,
  START_MARKER,
  END_MARKER
} from '../src/updater.js';

describe('findMarkers', () => {
  it('should find markers in content', () => {
    const content = `# README\n\n${START_MARKER}\nold content\n${END_MARKER}\n\nMore text`;
    const markers = findMarkers(content);

    expect(markers).not.toBeNull();
    expect(markers.start).toBeGreaterThan(0);
    expect(markers.end).toBeGreaterThan(markers.start);
  });

  it('should return null if START marker missing', () => {
    const content = `# README\n\nsome content\n${END_MARKER}`;
    expect(findMarkers(content)).toBeNull();
  });

  it('should return null if END marker missing', () => {
    const content = `# README\n\n${START_MARKER}\nsome content`;
    expect(findMarkers(content)).toBeNull();
  });

  it('should return null if markers in wrong order', () => {
    const content = `${END_MARKER}\nsome content\n${START_MARKER}`;
    expect(findMarkers(content)).toBeNull();
  });

  it('should find markers at correct positions', () => {
    const before = '# README\n\n';
    const middle = '\nold content\n';
    const after = '\n\nMore text';
    const content = `${before}${START_MARKER}${middle}${END_MARKER}${after}`;

    const markers = findMarkers(content);

    expect(markers.start).toBe(before.length);
    expect(markers.startEnd).toBe(before.length + START_MARKER.length);
    expect(markers.end).toBe(before.length + START_MARKER.length + middle.length);
    expect(markers.endEnd).toBe(before.length + START_MARKER.length + middle.length + END_MARKER.length);
  });
});

describe('insertContent', () => {
  it('should insert content between markers', () => {
    const original = `# README\n\n${START_MARKER}\nold content\n${END_MARKER}\n\nFooter`;
    const newContent = 'new dashboard content';

    const result = insertContent(original, newContent);

    expect(result.success).toBe(true);
    expect(result.content).toContain(START_MARKER);
    expect(result.content).toContain(END_MARKER);
    expect(result.content).toContain('new dashboard content');
    expect(result.content).not.toContain('old content');
  });

  it('should preserve content before START marker', () => {
    const original = `# README\n\nIntro text\n\n${START_MARKER}\nold\n${END_MARKER}`;
    const result = insertContent(original, 'new');

    expect(result.content).toContain('# README');
    expect(result.content).toContain('Intro text');
  });

  it('should preserve content after END marker', () => {
    const original = `${START_MARKER}\nold\n${END_MARKER}\n\nFooter text`;
    const result = insertContent(original, 'new');

    expect(result.content).toContain('Footer text');
  });

  it('should fail if markers not found', () => {
    const original = '# README\n\nNo markers here';
    const result = insertContent(original, 'new');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Markers not found');
    expect(result.content).toBe(original);
  });

  it('should handle empty new content', () => {
    const original = `${START_MARKER}\nold\n${END_MARKER}`;
    const result = insertContent(original, '');

    expect(result.success).toBe(true);
    expect(result.content).toBe(`${START_MARKER}\n\n${END_MARKER}`);
  });

  it('should handle multiline new content', () => {
    const original = `${START_MARKER}\nold\n${END_MARKER}`;
    const newContent = 'line1\nline2\nline3';
    const result = insertContent(original, newContent);

    expect(result.success).toBe(true);
    expect(result.content).toContain('line1');
    expect(result.content).toContain('line2');
    expect(result.content).toContain('line3');
  });
});

describe('marker constants', () => {
  it('should export correct marker values', () => {
    expect(START_MARKER).toBe('<!-- VIBE-DASHBOARD:START -->');
    expect(END_MARKER).toBe('<!-- VIBE-DASHBOARD:END -->');
  });
});
