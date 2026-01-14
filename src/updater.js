import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const START_MARKER = '<!-- VIBE-DASHBOARD:START -->';
const END_MARKER = '<!-- VIBE-DASHBOARD:END -->';

/**
 * Update README file with new dashboard content
 * @param {string} readmePath - Path to the README file
 * @param {string} content - New content to insert between markers
 * @returns {Promise<object>} Result with success status and message
 */
export async function updateReadme(readmePath, content) {
  try {
    const original = await readFile(readmePath, 'utf-8');
    const result = insertContent(original, content);

    if (!result.success) {
      return result;
    }

    await writeFile(readmePath, result.content, 'utf-8');
    return { success: true, message: 'README updated successfully' };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, message: `File not found: ${readmePath}` };
    }
    throw error;
  }
}

/**
 * Find marker positions in content
 * @param {string} content - Content to search
 * @returns {object} Marker positions or null if not found
 */
export function findMarkers(content) {
  const startIndex = content.indexOf(START_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1) {
    return null;
  }

  if (endIndex <= startIndex) {
    return null;
  }

  return {
    start: startIndex,
    startEnd: startIndex + START_MARKER.length,
    end: endIndex,
    endEnd: endIndex + END_MARKER.length
  };
}

/**
 * Insert new content between markers
 * @param {string} original - Original content
 * @param {string} newContent - Content to insert
 * @returns {object} Result with success, content, and message
 */
export function insertContent(original, newContent) {
  const markers = findMarkers(original);

  if (!markers) {
    return {
      success: false,
      content: original,
      message: `Markers not found. Please add the following markers to your README:\n\n${START_MARKER}\n${END_MARKER}`
    };
  }

  const before = original.substring(0, markers.startEnd);
  const after = original.substring(markers.end);

  const updated = `${before}\n${newContent}\n${after}`;

  return {
    success: true,
    content: updated,
    message: 'Content inserted successfully'
  };
}

/**
 * Write SVG file to disk
 * @param {string} svgPath - Path to save the SVG file
 * @param {string} svgContent - SVG content
 * @returns {Promise<object>} Result with success status
 */
export async function writeSVG(svgPath, svgContent) {
  try {
    // Ensure directory exists
    const dir = dirname(svgPath);
    await mkdir(dir, { recursive: true });

    await writeFile(svgPath, svgContent, 'utf-8');
    return { success: true, message: `SVG saved to ${svgPath}` };
  } catch (error) {
    return { success: false, message: `Failed to write SVG: ${error.message}` };
  }
}

/**
 * Check if README has markers
 * @param {string} readmePath - Path to the README file
 * @returns {Promise<boolean>} Whether markers exist
 */
export async function hasMarkers(readmePath) {
  try {
    const content = await readFile(readmePath, 'utf-8');
    return findMarkers(content) !== null;
  } catch {
    return false;
  }
}

/**
 * Add markers to README if not present
 * @param {string} readmePath - Path to the README file
 * @returns {Promise<object>} Result with success status
 */
export async function addMarkers(readmePath) {
  try {
    const content = await readFile(readmePath, 'utf-8');

    if (findMarkers(content) !== null) {
      return { success: true, message: 'Markers already exist' };
    }

    const markersBlock = `\n\n${START_MARKER}\n${END_MARKER}\n`;
    const updated = content + markersBlock;

    await writeFile(readmePath, updated, 'utf-8');
    return { success: true, message: 'Markers added to README' };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, message: `File not found: ${readmePath}` };
    }
    throw error;
  }
}

export { START_MARKER, END_MARKER };

export default {
  updateReadme,
  findMarkers,
  insertContent,
  writeSVG,
  hasMarkers,
  addMarkers,
  START_MARKER,
  END_MARKER
};
