/** Returns the first 4–8 digit number that follows a colon in `text`. */
export function extractCode(text: string): string | undefined {
  return /:\s+.*?(\b\d{4,8}\b)/.exec(text)?.[1];
}
