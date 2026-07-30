const slugPattern =
  /^[a-z0-9\u10a0-\u10ff]+(?:-[a-z0-9\u10a0-\u10ff]+)*$/;

export function createSlug(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ka")
    .trim()
    .replace(/[^a-z0-9\u10a0-\u10ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(value: string) {
  return slugPattern.test(value);
}

export function decodeSlugParam(value: string) {
  try {
    return decodeURIComponent(value).normalize("NFKC");
  } catch {
    return value.normalize("NFKC");
  }
}
