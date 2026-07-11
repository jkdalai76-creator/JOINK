/**
 * Turns a spoken request into a project topic + website URLs, so users can
 * fill the extraction form by voice. Handles spoken punctuation
 * ("example dot com slash guides" → "example.com/guides") and strips filler
 * words to leave a clean topic for the project name.
 */
export interface ParsedVoiceRequest {
  name: string;
  urls: string[];
}

const FILLER =
  /\b(please|can you|could you|i want to|i would like to|scrape|extract|extraction|research|analyse|analyze|about|regarding|from|on|the website|website|web site|web page|webpage|page|url|urls|link|links|for me|and|get|find|pull|grab)\b/gi;

export function parseVoiceRequest(input: string): ParsedVoiceRequest {
  let text = ` ${input.trim()} `;

  // Spoken punctuation → symbols.
  text = text
    .replace(/\s+dot\s+/gi, ".")
    .replace(/\s+slash\s+/gi, "/")
    .replace(/\s+colon\s+/gi, ":")
    .replace(/\s+(dash|hyphen)\s+/gi, "-")
    .replace(/\s+underscore\s+/gi, "_");

  // Find URL-like tokens (with or without scheme / www).
  const urlRegex = /((https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s]*)?)/gi;
  const urls: string[] = [];
  const seen = new Set<string>();
  let leftover = text;

  for (const match of text.matchAll(urlRegex)) {
    const raw = match[1];
    if (!/\.[a-z]{2,}/i.test(raw)) continue; // needs a real TLD
    let normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    normalized = normalized.replace(/[.,;:!?]+$/, ""); // trailing punctuation
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      urls.push(normalized);
    }
    leftover = leftover.replace(raw, " ");
  }

  // Whatever remains, minus filler words, becomes the topic / project name.
  let name = leftover.replace(FILLER, " ").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  if (name) name = name.charAt(0).toUpperCase() + name.slice(1);
  if (name.length > 80) name = name.slice(0, 80).trim();

  return { name, urls };
}
