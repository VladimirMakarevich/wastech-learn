import { LearnError } from "./errors.js";

/**
 * A source of numbers in [0, 1). The caller owns it: a host passes a cryptographic source, a test a
 * seeded one, so the same seed gives the same ids on every run.
 */
export type RandomSource = () => number;

// Crockford base32 leaves out i, l, o and u: an id survives being read aloud, retyped or misread.
const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";

const CARD_ID_LENGTH = 8;
const ULID_TIME_LENGTH = 10;
const ULID_RANDOM_LENGTH = 16;
// 48 bits of milliseconds cover dates until the year 10889; past that a ULID cannot encode the time.
const ULID_MAX_TIME = 2 ** 48 - 1;

const symbol = (random: RandomSource): string => {
  const value = random();
  if (!(value >= 0 && value < 1)) {
    throw new LearnError(
      "id-unavailable",
      "A random source must return numbers in [0, 1)",
      { subject: String(value) },
    );
  }
  return CROCKFORD.charAt(Math.floor(value * CROCKFORD.length));
};

/**
 * A new card id: 8 random lower-case Crockford base32 characters. Random, never derived from the card's
 * text, so an edit never changes the identity the review log refers to.
 */
export const newCardId = (random: RandomSource): string =>
  Array.from({ length: CARD_ID_LENGTH }, () => symbol(random)).join("");

// About 10^12 ids exist; a hundred collisions in a row means the random source is broken, not unlucky.
const MAX_ID_ATTEMPTS = 100;

/**
 * A card id that none of `taken` uses. The review log keys history by id alone, so a collision would
 * merge two cards' histories; drawing again is cheaper than ever detecting that later.
 */
export const newUniqueCardId = (
  random: RandomSource,
  taken: ReadonlySet<string>,
): string => {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
    const id = newCardId(random);
    if (!taken.has(id)) return id;
  }
  throw new LearnError(
    "id-unavailable",
    "The random source keeps repeating taken card ids",
  );
};

/**
 * A ULID for a review event: the time in the first 10 characters, so ids of one device sort in the
 * order the events happened, and 80 random bits, so two devices writing in the same millisecond do not
 * collide. Upper case, as the event schema expects.
 */
export const newUlid = (now: Date, random: RandomSource): string => {
  let time = now.getTime();
  if (!Number.isInteger(time) || time < 0 || time > ULID_MAX_TIME) {
    throw new LearnError(
      "id-unavailable",
      "A ULID needs a time between 1970 and 10889",
      { subject: String(time) },
    );
  }
  const head: string[] = [];
  for (let index = 0; index < ULID_TIME_LENGTH; index++) {
    head.unshift(CROCKFORD.charAt(time % 32));
    time = Math.floor(time / 32);
  }
  const tail = Array.from({ length: ULID_RANDOM_LENGTH }, () => symbol(random));
  return [...head, ...tail].join("").toUpperCase();
};
