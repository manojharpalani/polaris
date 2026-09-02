let counter = 0;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function newId(prefix: string): string {
  counter += 1;
  return `${slugify(prefix)}-${Date.now().toString(36)}-${counter}`;
}
