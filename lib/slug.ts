// Slugs are lowercase ASCII: Georgian names are transliterated, so shared URLs stay
// readable instead of turning into %E1%83%... The database enforces the same pattern
// (categories_slug_check / products_slug_check in the storefront repo's supabase/schemas).
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Georgia's national romanization (2002), without the optional apostrophes. Must stay in
// step with pg_temp.transliterate_slug in the storefront repo's
// supabase/migrations/20261109000000_transliterate_slugs.sql, which converted the slugs
// that existed before this — otherwise an old and a new product with the same name would
// get differently spelled slugs.
const georgianToLatin: Record<string, string> = {
  ა: "a", ბ: "b", გ: "g", დ: "d", ე: "e", ვ: "v", ზ: "z", თ: "t", ი: "i",
  კ: "k", ლ: "l", მ: "m", ნ: "n", ო: "o", პ: "p", ჟ: "zh", რ: "r", ს: "s",
  ტ: "t", უ: "u", ფ: "p", ქ: "k", ღ: "gh", ყ: "q", შ: "sh", ჩ: "ch", ც: "ts",
  ძ: "dz", წ: "ts", ჭ: "ch", ხ: "kh", ჯ: "j", ჰ: "h",
};

// The slug as typed into the slug field, keystroke by keystroke. Identical to createSlug
// except that ONE trailing hyphen survives: createSlug strips it, and running that on every
// keystroke swallowed the hyphen before the next word could be typed ("small-bed" came out
// as "smallbed"). The field runs createSlug on blur, and the server always does.
export function createSlugWhileTyping(value: string) {
  return (
    value
      // NFKD splits "é" into "e" + an accent mark, so the mark can be dropped below
      // instead of the whole letter.
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      // "ka" also folds Mtavruli capitals (ᲡᲐᲬᲝᲚᲘ) into the letters mapped above.
      .toLocaleLowerCase("ka")
      .replace(/[ა-ჰ]/g, (letter) => georgianToLatin[letter] ?? "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+/, "")
  );
}

export function createSlug(value: string) {
  return createSlugWhileTyping(value).replace(/-+$/, "");
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
