// lib/utils/feed-parser.ts
export interface ParsedFileInfo {
  session: string;
  realName: string;
  phoneSuffix: string;
  gender: string;
  caption: string;
}

export const parseDriveFileName = (fileName: string): ParsedFileInfo | null => {
  try {
    if (!fileName) return null;
    const pureName = fileName.replace(/\.[^/.]+$/, "");
    const parts = pureName.split("_");
    if (parts.length < 4) return null;
    return {
      session: parts[0].padStart(2, '0'),
      realName: parts[1].trim(),
      phoneSuffix: parts[2].trim(),
      gender: parts[3].trim(),
      caption: parts.slice(4).join("_").trim() || ""
    };
  } catch (e) { return null; }
};