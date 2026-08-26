/**
 * This language currently defines no options of its own, but the type stays
 * a plain object (rather than e.g. `Record<string, never>`) because, per the
 * Language API contract, unrecognized keys must be accepted and ignored, not
 * rejected.
 *
 * Lives at the src root (rather than under `language/`) because it's
 * intrinsically about the shape of gitignore language options, not about the
 * `Language`/`SourceCode` adapter machinery itself -- both the language
 * layer and the rules layer need it, and neither should have to depend on
 * the other just to reach it.
 */
export type GitignoreLanguageOptions = Record<string, unknown>;
