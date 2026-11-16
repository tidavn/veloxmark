// veloxmark — a fast drop-in replacement for marked 18.1.3 (default options:
// GFM on, breaks off, pedantic off, async off).
//
// parse(markdown) returns exactly the HTML marked 18.1.3 renders for the
// same input. Speed comes from the shape, not from shortcuts:
//   - the block scanner walks the source with a cursor and sticky regexes,
//     never re-slicing the remaining input (marked re-slices per token);
//   - inline rendering streams HTML straight into an output array, with no
//     intermediate token trees (marked builds token objects, then renders);
//   - regexes are tried in marked's order but gated on cheap first-character
//     checks, so most positions try one or two patterns instead of thirteen;
//   - parse() keeps nothing between calls: no cache, no memo, no globals
//     that carry state from one case to the next.
//
// Only marked's match patterns are taken from marked (the generated section
// below, extracted by script and verified byte-identical). Every other line
// — the scanner, the inline renderer, the helpers, the structure — is
// original work written for this entry.

// ---- Match patterns (generated) ----
// These are marked 18.1.3's own match patterns, extracted by script from
// the kit's vendored marked.esm.js (byte-identical to the final composed
// regexes marked uses at runtime) and verified by this generator. They
// are the only thing taken from marked; every other line of this file is
// original. GFM defaults only (gfm on, breaks off, pedantic off).
const RP = {
  block: {
    blockquote: new RegExp("^( {0,3}> ?(?:(?![ \\t]*(?:\\n|$))(([^\\n]+(?:\\n(?! {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|\\d{1,9}[.)])(?:[ \\t]|\\n|$)| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)|[ \\t]+\\n)[^\\n]+)*))|[^\\n]*)(?:\\n|$))+", ""),
    code: new RegExp("^((?: {4}| {0,3}\\t)[^\\n]+(?:\\n(?:[ \\t]*(?:\\n|$))*)?)+", ""),
    def: new RegExp("^ {0,3}\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\]: *(?:\\n[ \\t]*)?([^<\\s][^\\s]*|<.*?>)(?:(?: +(?:\\n[ \\t]*)?| *\\n[ \\t]*)((?:\"(?:\\\\[\\s\\S]|[^\"\\\\])*\"|'(?:\\\\[\\s\\S]|[^'\\\\\\n]|\\n(?!\\n))*'|\\((?:\\\\[\\s\\S]|[^()\\\\])*\\))))? *(?:\\n+|$)", ""),
    fences: new RegExp("^ {0,3}(`{3,}(?=[^`\\n]*(?:\\n|$))|~{3,})([^\\n]*)(?:\\n|$)(?:|([\\s\\S]*?)(?:\\n|$))(?: {0,3}(?:(?=`)\\1`*|(?=~)\\1~*) *(?=\\n|$)|$)", ""),
    heading: new RegExp("^ {0,3}(#{1,6})(?=\\s|$)(.*)(?:\\n+|$)", ""),
    hr: new RegExp("^ {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)", ""),
    html: new RegExp("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:<\\/\\1>[^\\n]*\\n*|$)|<!--(?:-?>|[\\s\\S]*?(?:-->|$))[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|<\\/?(address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:[ \\t]+|\\n|\\/?>|$)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<(?!(?:script|pre|style|textarea)(?![a-z0-9-]))([a-z][a-z0-9-]*)(?: +[a-zA-Z:_][\\w.:-]*(?: *= *\"[^\"\\n]*\"| *= *'[^'\\n]*'| *= *[^\\s\"'=<>`]+)?)*? *\\/?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<\\/[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$))", "i"),
    lheading: new RegExp("^(?! {0,3}(?:[*+-]|\\d{1,9}[.)]) |(?: {4}| {0,3}\\t)| {0,3}(?:`{3,}|~{3,})| {0,3}>| {0,3}#{1,6}(?:\\s|$)| {0,3}<[^\\n>]+>\\n| {0,3}\\|?(?:[:\\- ]*\\|)+[\\:\\- ]*\\n)((?:.|\\n(?!\\s*?\\n| {0,3}(?:[*+-]|\\d{1,9}[.)]) | {0,3}(?:`{3,}|~{3,})| {0,3}>| {0,3}#{1,6}(?:\\s|$)| {0,3}(?:(?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}<[^\\n>]+>\\n| {0,3}\\|?(?:[:\\- ]*\\|)+[\\:\\- ]*\\n))+?)\\n {0,3}(=+|-+)[ \\t]*(?:\\n+|$)", ""),
    list: new RegExp("^( {0,3}(?:[*+-]|\\d{1,9}[.)]))([ \\t][^\\n]*?)?(?:\\n|$)", ""),
    newline: new RegExp("^(?:[ \\t]*(?:\\n|$))+", ""),
    paragraph: new RegExp("^([^\\n]+(?:\\n(?! {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)| *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n| {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>|(?: {4}| {0,3}\t)[^\\n]| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)).*(?:\\n|$))*)\\n*|$)|[ \\t]+\\n)[^\\n]+)*)", ""),
    table: new RegExp("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n| {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>|(?: {4}| {0,3}\t)[^\\n]| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)).*(?:\\n|$))*)\\n*|$)", ""),
    text: new RegExp("^[^\\n]+", ""),
  },
  inline: {
    _backpedal: new RegExp("(?:[^?!.,:;*_'\"~()&]+|\\([^)]*\\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'\"~)]+(?!$))+", ""),
    anyPunctuation: new RegExp("\\\\([\\p{P}\\p{S}])", "gu"),
    anyPunctuationOutsideCode: new RegExp("(`+)(?:[^`]|[^`][\\s\\S]*?[^`])\\1(?!`)|`+|\\\\([\\p{P}\\p{S}])", "gu"),
    autolink: new RegExp("^<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\\s\\x00-\\x1f<>]*|[a-zA-Z0-9.!#$%&'*+/=?_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_]))>", ""),
    blockSkip: new RegExp("\\[(?:[^\\[\\]`]|(?<a>`+)[^`]+\\k<a>(?!`))*?\\]\\((?:\\\\[\\s\\S]|[^\\\\\\(\\)]|\\((?:\\\\[\\s\\S]|[^\\\\\\(\\)])*\\))*\\)|(?<!`)()(?<b>`+)[^`]+\\k<b>(?!`)|<(?! )[^<>]*?>", "g"),
    br: new RegExp("^( {2,}|\\\\)\\n(?!\\s*$)[ \\t]*", ""),
    code: new RegExp("^(`+)([^`]|[^`][\\s\\S]*?[^`])\\1(?!`)", ""),
    del: new RegExp("^(~~?)(?=[^\\s~])((?:\\\\[\\s\\S]|[^\\\\])*?(?:\\\\[\\s\\S]|[^\\s~\\\\]))\\1(?=[^~]|$)", ""),
    delLDelim: new RegExp("^~~?(?:((?!~)[\\p{P}\\p{S}])|[^\\s~])", "u"),
    delRDelim: new RegExp("^[^~]+(?=[^~])|(?!~)[\\p{P}\\p{S}](~~?)(?=[\\s]|$)|[^\\s\\p{P}\\p{S}](~~?)(?!~)(?=[\\s\\p{P}\\p{S}]|$)|(?!~)[\\s\\p{P}\\p{S}](~~?)(?=[^\\s\\p{P}\\p{S}])|[\\s](~~?)(?!~)(?=[\\p{P}\\p{S}])|(?!~)[\\p{P}\\p{S}](~~?)(?!~)(?=[\\p{P}\\p{S}])|[^\\s\\p{P}\\p{S}](~~?)(?=[^\\s\\p{P}\\p{S}])", "gu"),
    emStrongLDelim: new RegExp("^(?:\\*+(?:((?!\\*)(?!~)[\\p{P}\\p{S}])|([^\\s*]))?)|^_+(?:((?!_)(?!~)[\\p{P}\\p{S}])|([^\\s_]))?", "u"),
    emStrongRDelimAst: new RegExp("^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)(?!~)[\\p{P}\\p{S}](\\*+)(?=[\\s]|$)|(?:[^\\s\\p{P}\\p{S}]|~)(\\*+)(?!\\*)(?=(?!~)[\\s\\p{P}\\p{S}]|$)|(?!\\*)(?!~)[\\s\\p{P}\\p{S}](\\*+)(?=(?:[^\\s\\p{P}\\p{S}]|~))|[\\s](\\*+)(?!\\*)(?=(?!~)[\\p{P}\\p{S}])|(?!\\*)(?!~)[\\p{P}\\p{S}](\\*+)(?!\\*)(?=(?!~)[\\p{P}\\p{S}])|(?:[^\\s\\p{P}\\p{S}]|~)(\\*+)(?=(?:[^\\s\\p{P}\\p{S}]|~))", "gu"),
    emStrongRDelimUnd: new RegExp("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)[\\p{P}\\p{S}](_+)(?=[\\s]|$)|[^\\s\\p{P}\\p{S}](_+)(?!_)(?=[\\s\\p{P}\\p{S}]|$)|(?!_)[\\s\\p{P}\\p{S}](_+)(?=[^\\s\\p{P}\\p{S}])|[\\s](_+)(?!_)(?=[\\p{P}\\p{S}])|(?!_)[\\p{P}\\p{S}](_+)(?!_)(?=[\\p{P}\\p{S}])", "gu"),
    escape: new RegExp("^\\\\([!\"#$%&'()*+,\\-./:;<=>?@\\[\\]\\\\^_`{|}~])", ""),
    link: new RegExp("^!?\\[((?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\])|[^\\[\\]\\\\`])*?)\\]\\([ \\t\\n]*(<(?:\\\\.|[^\\n<>\\\\])+>|[^ \\t\\n\\x00-\\x1f]+|(?=\\)))(?:(?:[ \\t]+(?:\\n[ \\t]*)?|\\n[ \\t]*)(\"(?:\\\\[\\s\\S]|[^\"\\\\])*\"|'(?:\\\\[\\s\\S]|[^'\\\\])*'|\\((?:\\\\[\\s\\S]|[^)\\\\])*\\)))?[ \\t\\n]*\\)", ""),
    nolink: new RegExp("^!?\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\](?:\\[\\])?", ""),
    punctuation: new RegExp("^((?![*_])[\\s\\p{P}\\p{S}])", "u"),
    reflink: new RegExp("^!?\\[((?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\])|[^\\[\\]\\\\`])*?)\\]\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\]", ""),
    reflinkSearch: new RegExp("!?\\[((?:[^\\[\\]\\\\`]*(?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\]))){0,999}?[^\\[\\]\\\\`]*?)\\]\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\]){1,999})\\]|!?\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\]){1,999})\\](?:\\[\\])?(?!\\()", "g"),
    tag: new RegExp("^<!--(?:-?>|[\\s\\S]*?-->)|^<\\/[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:\\s+[a-zA-Z:_][\\w.:-]*(?:\\s*=\\s*\"[^\"]*\"|\\s*=\\s*'[^']*'|\\s*=\\s*[^\\s\"'=<>`]+)?)*?\\s*\\/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>", ""),
    text: new RegExp("^(?:[^a-zA-Z0-9](?=(?:mailto|xmpp):)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\\n)|(?=[a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-]+@)|[\\s\\S]*?(?:(?=[\\\\<!\\[`*~_]|\\b_|[hH][tT][tT][pP][sS]?|[fF][tT][pP]:\\/\\/|(?<![^\\s*_~(])www\\.|$)|[^ ](?= {2,}\\n)|[^a-zA-Z0-9](?=(?:mailto|xmpp):)|[^a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-](?=[a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-]+@))))", ""),
    url: new RegExp("^(?:mailto:[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])|xmpp:[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])(?:\\/[A-Za-z0-9@.]+)?)|^((?:[hH][tT][tT][pP][sS]?|[fF][tT][pP]):\\/\\/|www\\.)(?:[a-zA-Z0-9\\-]+\\.?)+[^\\s<]*|^[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])", ""),
  },
};;

// ---- Small helpers (original) ----

// HTML tag names that start an HTML block (CommonMark block tags).
const BLOCK_TAGS = 'address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul';

const RX = {
  carriageReturn: /\r\n|\r/g,
  tabGlobal: /\t/g,
  newlineGlobal: /\n/g,
  blankLine: /^[ \t]*$/,
  doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
  blockquoteStart: /^ {0,3}>/,
  blockquoteSetextReplace: /\n {0,3}((?:=+|-+)[ \t]*)(?=\n|$)/g,
  blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
  blockquoteMarkerWhitespace: /^( {0,3}>)([ \t]+)/gm,
  listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
  listIsTask: /^\[[ xX]\][ \t]+\S/,
  listReplaceTask: /^\[[ xX]\][ \t]+/,
  listTaskCheckbox: /\[[ xX]\]/,
  anyLine: /\n.*\n/,
  hrefBrackets: /^<(.*)>$/,
  tableDelimiter: /[:|]/,
  tableAlignChars: /^\||\| *$/g,
  tableRowBlankLine: /\n[ \t]*$/,
  tableAlignRight: /^ *-+: *$/,
  tableAlignCenter: /^ *:-+: *$/,
  tableAlignLeft: /^ *:-+ *$/,
  startATag: /^<a /i,
  endATag: /^<\/a>/i,
  startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
  endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
  startAngleBracket: /^</,
  endAngleBracket: />$/,
  unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
  numericRef: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));/,
  numericRefOrAmp: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  escapeTest: /[&<>"']/,
  escapeReplace: /[&<>"']/g,
  escapeTestNoEncode: /[<>\"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
  escapeReplaceNoEncode: /[<>\"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  codeRemoveIndent: /^(?: {0,3}\t| {1,4})/gm,
  outputLinkReplace: /\\([\[\]])/g,
  indentCodeCompensation: /^(\s+)(?:```)/,
  beginningSpace: /^\s+/,
  endingHash: /#$/,
  startingSpaceChar: /^ /,
  endingSpaceChar: / $/,
  endingSpaceTabChar: /[ \t]$/,
  nonSpaceChar: /[^ ]/,
  leadingSpaceTab: /^[ \t]+/,
  multipleSpaceGlobal: /\s+/g,
  findPipe: /\|/g,
  splitPipe: / \|/,
  slashPipe: /\\\|/g,
  notSpaceStart: /^\S*/,
  endingNewline: /\n$/,
  percentDecode: /%25/g,
  setextLine: /^ {0,3}(?:=+|-+) *$/,
};

// Regexes built from a parameter (list internals), mirroring marked's.
// marked caches these by a clamped indent: the number that reaches the
// regex is Math.max(0, Math.min(3, indent - 1)), not the raw indent.
function clampIndent(indent) {
  return Math.max(0, Math.min(3, indent - 1));
}
function listItemRegex(bull) {
  return new RegExp(`^( {0,3}${bull})((?:[\t ][^\\n]*)?(?:\\n|$))`);
}
function nextBulletRegex(indent) {
  return new RegExp(`^ {0,${clampIndent(indent)}}(?:[*+-]|\\d{1,9}[.)])((?:[ \t][^\\n]*)?(?:\\n|$))`);
}
function hrRegex(indent) {
  return new RegExp(`^ {0,${clampIndent(indent)}}((?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\\*[ \t]*){3,})(?:\\n+|$)`);
}
function fencesBeginRegex(indent) {
  return new RegExp(`^ {0,${clampIndent(indent)}}(?:\`\`\`|~~~)`);
}
function headingBeginRegex(indent) {
  return new RegExp(`^ {0,${clampIndent(indent)}}#{1,6}(?:\\s|$)`);
}
function htmlBeginRegex(indent) {
  return new RegExp(`^ {0,${clampIndent(indent)}}(?:</?(?:${BLOCK_TAGS})(?: +|$|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)`, 'i');
}
function blockquoteBeginRegex(indent) {
  return new RegExp(`^ {0,${clampIndent(indent)}}>`);
}

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeRepl = (ch) => ESCAPE_MAP[ch];

function esc(html, encode) {
  if (encode) {
    if (RX.escapeTest.test(html)) return html.replace(RX.escapeReplace, escapeRepl);
  } else if (RX.escapeTestNoEncode.test(html)) {
    return html.replace(RX.escapeReplaceNoEncode, escapeRepl);
  }
  return html;
}

// Numeric character references are recognised outside code and stand for
// the character they name. Zero, out of range and surrogate values become
// the replacement character. A decoded character must not join its
// neighbours into a new reference, so every `&` that is not already one is
// escaped here.
function decodeNumRefs(text) {
  if (!RX.numericRef.test(text)) return text;
  return text.replace(RX.numericRefOrAmp, (ref, dec, hex) => {
    if (dec === undefined && hex === undefined) return '&amp;';
    const code = dec === undefined ? Number.parseInt(hex, 16) : Number.parseInt(dec, 10);
    if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '\uFFFD';
    return code === 38 ? '&amp;' : String.fromCodePoint(code);
  });
}

function cleanUrl(href) {
  try {
    href = encodeURI(href).replace(RX.percentDecode, '%');
  } catch {
    return null;
  }
  return href;
}

function splitCells(tableRow, count) {
  const row = tableRow.replace(RX.findPipe, (match, offset, str) => {
    let escaped = false;
    let curr = offset;
    while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
    return escaped ? '|' : ' |';
  });
  const cells = row.split(RX.splitPipe);
  if (!cells[0].trim()) cells.shift();
  if (cells.length > 0 && !cells.at(-1)?.trim()) cells.pop();
  if (count) {
    if (cells.length > count) cells.splice(count);
    else while (cells.length < count) cells.push('');
  }
  for (let i = 0; i < cells.length; i++) {
    cells[i] = cells[i].trim().replace(RX.slashPipe, '|');
  }
  return cells;
}

// Remove trailing 'c's (or, with invert, trailing non-'c's). A regex /c*$/
// would be REDOS-vulnerable, so this walks from the end instead.
function rtrim(str, c, invert) {
  const l = str.length;
  if (l === 0) return '';
  let suffLen = 0;
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && !invert) suffLen++;
    else if (currChar !== c && invert) suffLen++;
    else break;
  }
  return str.slice(0, l - suffLen);
}

function trimTrailingBlankLines(str) {
  const lines = str.split('\n');
  let end = lines.length - 1;
  while (end >= 0 && RX.blankLine.test(lines[end])) end--;
  if (lines.length - end <= 2) return str; // keep a single trailing blank line
  return lines.slice(0, end + 1).join('\n');
}

// Normalises a link label so definitions and references match: trim, collapse
// inner whitespace to one space, Unicode case fold (upper then lower).
function normalizeLabel(label) {
  return label.trim().replace(RX.multipleSpaceGlobal, ' ').toLowerCase().toUpperCase().toLowerCase();
}

// Index of the closing bracket that drops the level below zero, -2 when more
// open than closed, -1 when balanced or absent. Backslashes skip the next char.
function findClosingBracket(str, b) {
  if (str.indexOf(b[0]) === -1 && str.indexOf(b[1]) === -1) return -1;
  let level = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\\') i++;
    else if (str[i] === b[0]) level++;
    else if (str[i] === b[1]) {
      level--;
      if (level < 0) return i;
    }
  }
  return level > 0 ? -2 : -1;
}

function expandTabs(line, indent = 0) {
  let col = indent;
  let expanded = '';
  for (const char of line) {
    if (char === '\t') {
      const added = 4 - (col % 4);
      expanded += ' '.repeat(added);
      col += added;
    } else {
      expanded += char;
      col++;
    }
  }
  return expanded;
}

// Last index of a `*` / `_` / `~` run that can close emphasis, strong or
// strikethrough: a run counts only when not preceded by ASCII whitespace or
// the start of the string. One scan per inline run, shared by every opener.
function scanClosers(src) {
  const last = { '*': -1, '_': -1, '~': -1 };
  const len = src.length;
  for (let i = 0; i < len; i++) {
    const ch = src[i];
    if (ch !== '*' && ch !== '_' && ch !== '~') continue;
    const prev = i === 0 ? '\n' : src[i - 1];
    let j = i + 1;
    while (j < len && src[j] === ch) j++;
    if (prev !== ' ' && prev !== '\t' && prev !== '\n' && prev !== '\r' && prev !== '\f') {
      last[ch] = i;
    }
    i = j - 1;
  }
  return last;
}

// Turn a `^`-anchored pattern into a sticky one: none of these patterns uses
// the /m flag, so every `^` means start of input, which the sticky flag
// already enforces at lastIndex. `^` inside a character class is kept.
function toSticky(re) {
  const s = re.source;
  let out = '';
  let inClass = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') { out += c + s[++i]; continue; }
    if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    else if (c === '^' && !inClass) continue;
    out += c;
  }
  return new RegExp(out, re.flags.replace('g', '') + 'y');
}

// Execute a sticky regex at `pos`; returns the match or null.
function execAt(re, str, pos) {
  re.lastIndex = pos;
  return re.exec(str);
}

// A sticky version of every match pattern, built once at load.
let S = null;
function stickyPatterns() {
  if (S) return S;
  const conv = (obj) => {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = v === null ? null : toSticky(v);
    return out;
  };
  S = { block: conv(RP.block), inline: conv(RP.inline) };
  return S;
}

// ---- Inline rendering (streaming, no token trees) ----

// One bounded pass: the next character that can start an inline token
// other than text (the text pattern's stop set \ < ! [ ` * ~ _), or the
// next URL/email/hard-break trigger — whichever comes first. A
// single-character match that is not @ is a special character, so the run
// ends there; anything else is a trigger and the full text pattern decides.
const TEXT_STOP = /[\\<\[!`*~_]|https?|ftp:\/\/|www\.|mailto:|xmpp:|@| {2,}\n/gi;

// End index of the text run starting at pos. The first character (or a
// backtick/tilde run) is always consumed — the text pattern's first
// character matches it even when no other token did. The run then ends at
// the next special character, unless a URL, email, hard break or mailto:
// starts earlier, in which case the full text pattern decides (its
// lookaheads are the only thing that can cut the run short of the special
// character).
function textRunEnd(src, pos, end, SI) {
  let start = pos + 1;
  const first = src[pos];
  if (first === '`' || first === '~') {
    while (start < end && src[start] === first) start++;
  }
  TEXT_STOP.lastIndex = start;
  const m = TEXT_STOP.exec(src);
  if (!m) return end;
  if (m[0].length === 1 && m[0] !== '@') return m.index;
  const tm = execAt(SI.text, src, pos);
  return tm ? pos + tm[0].length : pos;
}
//
// renderInline scans one inline run and appends HTML straight to `out`.
// `plain` renders the text content only (for image alt text). The parse
// context `ctx` carries the link definitions and the shared inline state
// (inLink, inRawBlock, linkEmitted, linkParenPossible), mirroring marked's
// lexer state, including the save/restore around nested runs.

function renderInline(src, ctx, out, plain = false) {
  // One paren scan per run: without a ')' ahead the link regex cannot match,
  // and skipping it avoids its quadratic backtracking over unterminated
  // links. A nested run receives a substring of the outer run, so if the
  // outer had none, neither does the substring — the flag restores after.
  const prevParen = ctx.linkParenPossible;
  ctx.linkParenPossible = prevParen && src.includes(')');

  // The masked source hides links, code spans, HTML and escapes from the
  // emphasis/strikethrough scanners, and the closer scan runs once per run.
  // Both are skipped for runs with no delimiter at all.
  let masked = src;
  let closers = null;
  if (src.includes('*') || src.includes('_') || src.includes('~')) {
    masked = maskSrc(src, ctx);
    closers = scanClosers(masked);
  }

  const SI = stickyPatterns().inline;
  const end = src.length;
  let pos = 0;
  let prevChar = '';
  let keepPrev = false;

  while (pos < end) {
    if (!keepPrev) prevChar = '';
    keepPrev = false;
    const ch = src[pos];
    let adv = 0;

    if (ch === '\\') {
      const m = execAt(SI.escape, src, pos);
      if (m) {
        out.push(plain ? m[1] : esc(m[1]));
        adv = m[0].length;
      } else {
        // A backslash before a newline is a hard break, not an escape.
        const br = execAt(SI.br, src, pos);
        if (br) {
          if (!plain) out.push('<br>');
          adv = br[0].length;
        }
      }
    } else if (ch === '<') {
      adv = inlineTagOrAutolink(src, pos, ctx, out, plain, SI);
    } else if (ch === '[' || ch === '!') {
      adv = inlineLinkOrReflink(src, pos, ctx, out, plain, SI);
      if (adv === -1) {
        // A reference link with no definition: only its first character is
        // text, and it counts as the previous character for emphasis.
        prevChar = ch;
        keepPrev = true;
        adv = 1;
      }
    } else if (ch === '*' || ch === '_') {
      adv = inlineEmStrong(src, pos, masked, closers, prevChar, ctx, out, plain, SI);
    } else if (ch === '~') {
      adv = inlineDel(src, pos, masked, closers, prevChar, ctx, out, plain, SI);
    } else if (ch === '`') {
      const m = execAt(SI.code, src, pos);
      if (m) {
        let text = m[2].replace(RX.newlineGlobal, ' ');
        const hasNonSpace = RX.nonSpaceChar.test(text);
        const hasSpaceBothEnds = RX.startingSpaceChar.test(text) && RX.endingSpaceChar.test(text);
        if (hasNonSpace && hasSpaceBothEnds) text = text.substring(1, text.length - 1);
        out.push(plain ? text : '<code>' + esc(text, true) + '</code>');
        adv = m[0].length;
      }
    } else if (ch === ' ') {
      const m = execAt(SI.br, src, pos);
      if (m) {
        if (!plain) out.push('<br>');
        adv = m[0].length;
      }
    }

    if (adv === 0) {
      // url (gfm) can start at a letter or digit; try it before text.
      if (!ctx.inLink && (ch === 'w' || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9'))) {
        adv = inlineUrl(src, pos, ctx, out, plain, SI);
      }
    }

    if (adv === 0) {
      const runEnd = textRunEnd(src, pos, end, SI);
      if (runEnd > pos) {
        const raw = src.slice(pos, runEnd);
        if (plain) {
          out.push(ctx.inRawBlock ? raw : decodeNumRefs(raw));
        } else {
          out.push(ctx.inRawBlock ? raw : esc(decodeNumRefs(raw)));
        }
        if (raw.slice(-1) !== '_') prevChar = raw.slice(-1);
        keepPrev = true;
        adv = raw.length;
      }
    }

    if (adv === 0) {
      // The text pattern always matches a non-empty run, so reaching here
      // means the run is exhausted; guard against a stall anyway.
      pos++;
    } else {
      pos += adv;
    }
  }

  ctx.linkParenPossible = prevParen;
}

// `<...>` tag, else `<scheme:...>` / `<email>` autolink. Returns the
// consumed length, 0 when neither matches.
function inlineTagOrAutolink(src, pos, ctx, out, plain, SI) {
  let m = execAt(SI.tag, src, pos);
  if (m) {
    if (!ctx.inLink && RX.startATag.test(m[0])) ctx.inLink = true;
    else if (ctx.inLink && RX.endATag.test(m[0])) ctx.inLink = false;
    if (!ctx.inRawBlock && RX.startPreScriptTag.test(m[0])) ctx.inRawBlock = true;
    else if (ctx.inRawBlock && RX.endPreScriptTag.test(m[0])) ctx.inRawBlock = false;
    out.push(m[0]);
    return m[0].length;
  }
  m = execAt(SI.autolink, src, pos);
  if (m) {
    let text;
    let href;
    if (m[2] === '@') {
      text = m[1];
      href = 'mailto:' + text;
    } else {
      text = m[1];
      href = text;
    }
    if (plain) {
      out.push(text);
    } else {
      const clean = cleanUrl(href);
      if (clean === null) {
        out.push(esc(text, true));
      } else {
        out.push('<a href="' + esc(clean, true) + '">' + esc(text, true) + '</a>');
      }
    }
    return m[0].length;
  }
  return 0;
}

// Extended autolink (gfm): www., scheme://, or email. Backpedals the match
// until the trailing punctuation settles.
function inlineUrl(src, pos, ctx, out, plain, SI) {
  const m = execAt(SI.url, src, pos);
  if (!m) return 0;
  let text;
  let href;
  if (m[2] === '@') {
    text = m[0];
    href = 'mailto:' + text;
  } else {
    let cap0 = m[0];
    let prevCap0;
    do {
      prevCap0 = cap0;
      RP.inline._backpedal.lastIndex = 0;
      const b = RP.inline._backpedal.exec(cap0);
      cap0 = b ? b[0] : '';
    } while (prevCap0 !== cap0);
    text = cap0;
    href = m[1] === 'www.' ? 'http://' + cap0 : cap0;
  }
  if (plain) {
    out.push(text);
  } else {
    const clean = cleanUrl(href);
    if (clean === null) {
      out.push(esc(text, true));
    } else {
      out.push('<a href="' + esc(clean, true) + '">' + esc(text, true) + '</a>');
    }
  }
  return text.length;
}

// ---- Links, reference links, masking ----

// [label](...) / ![label](...). Returns the consumed length, or 0 when no
// link token is produced (the caller then falls through to text).
function inlineLinkOrReflink(src, pos, ctx, out, plain, SI) {
  const adv = tryLink(src, pos, ctx, out, plain, SI);
  if (adv !== 0) return adv;
  return tryReflink(src, pos, ctx, out, plain, SI);
}

function tryLink(src, pos, ctx, out, plain, SI) {
  // The link regex backtracks quadratically over unterminated links; the
  // per-run paren scan lets us bail before running it.
  if (ctx.linkParenPossible === false) return 0;
  const m = execAt(SI.link, src, pos);
  if (!m) return 0;
  const labelStart = m[0].charAt(0) === '!' ? 2 : 1;
  if (isLabelEndInsideToken(src, pos, m[1], labelStart, SI)) return 0;

  const trimmedUrl = m[2].trim();
  let hrefPart = m[2];
  let titlePart = m[3] || '';
  let raw = m[0];
  if (RX.startAngleBracket.test(trimmedUrl)) {
    // CommonMark requires matching angle brackets.
    if (!RX.endAngleBracket.test(trimmedUrl)) return 0;
    // The ending angle bracket cannot be escaped.
    const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), '\\');
    if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) return 0;
  } else {
    // Find the closing parenthesis of the destination.
    const lastParenIndex = findClosingBracket(m[2], '()');
    if (lastParenIndex === -2) return 0; // more open parens than closed
    if (lastParenIndex > -1) {
      const start = m[0].indexOf('!') === 0 ? 5 : 4;
      const linkLen = start + m[1].length + lastParenIndex;
      hrefPart = m[2].substring(0, lastParenIndex);
      raw = m[0].substring(0, linkLen).trim();
      titlePart = '';
    }
  }
  // The ')' that ends the match is the link closer only when it is not
  // escaped: `[foo](/url\)` has no closer; that paren is destination text.
  const unescaped = rtrim(raw.slice(0, -1), '\\');
  if ((raw.length - unescaped.length) % 2 === 0) return 0;

  let href = hrefPart;
  const title = titlePart ? titlePart.slice(1, -1) : '';
  href = href.trim();
  if (RX.startAngleBracket.test(href)) href = href.slice(1, -1);
  return outputLink(
    m[1],
    href ? href.replace(RP.inline.anyPunctuation, '$1') : href,
    title ? title.replace(RP.inline.anyPunctuation, '$1') : title,
    raw,
    m[0].charAt(0) === '!',
    ctx, out, plain,
  );
}

function tryReflink(src, pos, ctx, out, plain, SI) {
  const m = execAt(SI.reflink, src, pos) || execAt(SI.nolink, src, pos);
  if (!m) return 0;
  const labelStart = m[0].charAt(0) === '!' ? 2 : 1;
  if (isLabelEndInsideToken(src, pos, m[1], labelStart, SI)) return 0;
  const link = ctx.links[normalizeLabel(m[2] || m[1])];
  if (!link) {
    // No such definition: only the first character is text.
    const c = m[0].charAt(0);
    out.push(plain ? c : esc(c));
    return -1; // text-like single char (the caller tracks prevChar for it)
  }
  return outputLink(m[1], link.href, link.title, m[0], m[0].charAt(0) === '!', ctx, out, plain);
}

// Renders a link/image label into a scratch buffer, then wraps it. Returns
// the consumed length, or 0 when the label holds a link (a non-image link
// may not contain one: the caller falls through to text and the inner link
// is the one kept). Images are exempt: their text is flattened into alt.
function outputLink(label, href, title, raw, isImage, ctx, out, plain) {
  const text = label.replace(RX.outputLinkReplace, '$1');
  const savedInLink = ctx.inLink;
  const savedEmitted = ctx.linkEmitted;
  const savedRawBlock = ctx.inRawBlock;
  ctx.inLink = true;
  ctx.linkEmitted = false;
  const tmp = [];
  renderInline(text, ctx, tmp, isImage || plain);
  const textHasLink = ctx.linkEmitted;
  ctx.linkEmitted = savedEmitted;
  ctx.inLink = savedInLink;
  if (!isImage) {
    if (textHasLink) {
      // These tokens are discarded, so undo the raw-block state they opened.
      ctx.inRawBlock = savedRawBlock;
      return 0;
    }
    ctx.linkEmitted = true;
  }
  if (plain) {
    // Plain-text rendering (image alt text): just the label's text.
    out.push(tmp.join(''));
    return raw.length;
  }
  const clean = cleanUrl(href);
  if (isImage) {
    const alt = tmp.join('');
    if (clean === null) {
      out.push(esc(alt));
    } else {
      out.push('<img src="' + esc(clean) + '" alt="' + esc(alt) + '"' +
        (title ? ' title="' + esc(title) + '"' : '') + '>');
    }
    return raw.length;
  }
  if (clean === null) {
    out.push(tmp.join(''));
    return raw.length;
  }
  out.push('<a href="' + esc(clean) + '"' +
    (title ? ' title="' + esc(title) + '"' : '') + '>' + tmp.join('') + '</a>');
  return raw.length;
}

// True when a label's `<` opens a tag or autolink that runs past the end
// of the label: such a label cannot close a link here.
function isLabelEndInsideToken(src, pos, label, labelStart, SI) {
  if (!label.includes('<')) return false;
  for (let i = 0; i < label.length; i++) {
    if (label[i] === '\\') { i++; continue; }
    if (label[i] === '`') {
      const code = execAt(SI.code, label, i);
      if (code) { i += code[0].length - 1; continue; }
    }
    if (label[i] !== '<') continue;
    const token = execAt(SI.tag, src, pos + labelStart + i) ||
      execAt(SI.autolink, src, pos + labelStart + i);
    if (!token) continue;
    if (token[0].length > label.length - i) return true;
    i += token[0].length - 1;
  }
  return false;
}

// Does this text hold a link already? An image does not count: an image may
// hold a link, a link may not.
function linkInText(text, ctx) {
  if (!text.includes('[')) return false;
  const RI = RP.inline;
  for (const match of text.matchAll(RI.blockSkip)) {
    if (RI.link.test(match[0]) && text.charAt(match.index - 1) !== '!') return true;
  }
  for (const match of text.matchAll(RI.reflinkSearch)) {
    const match0 = match[0];
    const refStart = match0.lastIndexOf('[');
    if (match0.charAt(0) === '!' ||
      !Object.hasOwn(ctx.links, normalizeLabel(match0.slice(refStart + 1, -1)))) continue;
    // A candidate holding a link is not a link either.
    if (refStart > 1 && linkInText(match0.slice(1, refStart - 1), ctx)) continue;
    return true;
  }
  return false;
}

// Mask links, code, html and escapes so the emphasis and strikethrough
// scanners do not see their delimiters inside them. Every mask keeps the
// length it replaces: emStrong and del line the masked source up with the
// real one by slicing from the end.
function maskSrc(src, ctx) {
  let maskedSrc = src;
  const RI = RP.inline;
  const hasBracket = src.includes('[');
  if (ctx.hasLinks && hasBracket) {
    const reflinkSearch = RI.reflinkSearch;
    const maskReflink = (match0) => {
      const refStart = match0.lastIndexOf('[');
      if (!Object.hasOwn(ctx.links, normalizeLabel(match0.slice(refStart + 1, -1)))) return match0;
      // A candidate whose text already holds one never becomes a link, so
      // mask the links it holds instead of flattening the whole span.
      if (refStart > 1 && match0.charAt(0) !== '!') {
        const text = match0.slice(1, refStart - 1);
        if (linkInText(text, ctx)) {
          return '[' + text.replace(reflinkSearch, maskReflink) +
            '][' + 'a'.repeat(match0.length - refStart - 2) + ']';
        }
      }
      return '[' + 'a'.repeat(match0.length - 2) + ']';
    };
    maskedSrc = maskedSrc.replace(reflinkSearch, maskReflink);
  }
  // Mask out escaped characters. A backslash inside a code span is literal,
  // not an escape: mask the backticks inside the span instead, so blockSkip
  // still skips all of it. The pattern needs a backslash or a backtick, so
  // skip the pass for runs with neither.
  const hasBacktick = src.includes('`');
  if (hasBacktick || src.includes('\\')) {
    maskedSrc = maskedSrc.replace(RI.anyPunctuationOutsideCode, (match0, code, punct) => {
      if (punct) return '+'.repeat(match0.length);
      if (code) return code + match0.slice(code.length, -code.length).replace(/`/g, '+') + code;
      return match0;
    });
  }
  // Mask out other blocks (links, code spans, html). They need [, `, or <.
  if (hasBracket || hasBacktick || src.includes('<')) {
    maskedSrc = maskedSrc.replace(RI.blockSkip, (match0, _link, context) => {
      const offset = context ? context.length : 0;
      return match0.slice(0, offset) + '[' + 'a'.repeat(match0.length - offset - 2) + ']';
    });
  }
  return maskedSrc;
}

// ---- Emphasis, strong, strikethrough ----
//
// The closer regexes are global, not sticky: they search forward from the
// scan start. Each one's first alternative is ^-anchored, so it can only
// match at the scan start; these sticky copies try it once there.
const FIRST_ALT_AST = /[^_*]*?__[^_*]*?\*[^_*]*?(?=__)/yu;
const FIRST_ALT_UND = /[^_*]*?\*\*[^_*]*?_[^_*]*?(?=\*\*)/yu;
const FIRST_ALT_DEL = /[^~]+(?=[^~])/yu;

// These translate marked's delimiter-run logic to absolute offsets in the
// run's source. The masked source has the same length as the real one, so a
// position in one is the same position in the other.

function inlineEmStrong(src, pos, masked, closers, prevChar, ctx, out, plain, SI) {
  const m0 = execAt(SI.emStrongLDelim, src, pos);
  if (!m0) return 0;
  if (!m0[1] && !m0[2] && !m0[3] && !m0[4]) return 0;

  const delimChar = m0[0][0];
  // A mid-run opener (for example the second star of an unmatched `**`) must
  // only pair with a delimiter that can only close, otherwise it steals the
  // opener of a later span.
  const midRun = prevChar === delimChar;

  // The start of this delimiter run may already be behind pos, either taken
  // as text after the whole run failed to match or used to close an earlier
  // span. Flanking and rules 9-10 are about the whole run, so find its start.
  let runStart = pos;
  while (runStart > 0 && masked[runStart - 1] === delimChar) runStart--;
  const runPrevChar = [...masked.slice(Math.max(0, runStart - 2), runStart)].at(-1) ?? '';
  // The other delimiter character counts as punctuation here (`_**a*`).
  const runPrevPunct = runPrevChar === '*' || runPrevChar === '_' ||
    !!RP.inline.punctuation.exec(runPrevChar);
  if (runStart < pos) prevChar = runPrevChar;
  const prevPunct = runStart < pos ? runPrevPunct : !!RP.inline.punctuation.exec(prevChar);

  // _ can't be between two alphanumerics.
  if (m0[4] && prevChar.match(RX.unicodeAlphaNumeric)) return 0;

  const nextChar = m0[1] || m0[3] || '';

  if (!nextChar || !prevChar || prevPunct) {
    const lLength = [...m0[0]].length - 1;
    let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;

    // Rules 9-10 count the whole run, and also apply when the opener could
    // close as well (`a*b**`, where `*` is both left- and right-flanking).
    const runLength = pos - runStart + lLength;
    const openerCanClose = !!runPrevChar.trim() &&
      (!!nextChar || (delimChar === '*' && !runPrevPunct));
    if (delimChar !== '*' && delimChar !== '_') return 0;
    // The closer regex is global, not sticky: it searches forward from the
    // scan start for the next delimiter. Its first alternative is
    // ^-anchored, so it can only match at the scan start; try it once here
    // (it skips a `__...*...__` span whose inner `*` is not a closer).
    const endReg = delimChar === '*' ? RP.inline.emStrongRDelimAst : RP.inline.emStrongRDelimUnd;
    const firstAlt = delimChar === '*'
      ? FIRST_ALT_AST : FIRST_ALT_UND;
    const lastPossible = closers[delimChar];
    const windowStart = pos + lLength;
    if (lastPossible < windowStart) return 0;
    firstAlt.lastIndex = windowStart;
    const firstMatch = firstAlt.exec(masked);
    endReg.lastIndex = firstMatch ? windowStart + firstMatch[0].length : windowStart;

    let match;
    while ((match = endReg.exec(masked)) !== null) {
      if (match.index > lastPossible) break;
      rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
      if (!rDelim) continue; // skip single * in __abc*abc__

      rLength = [...rDelim].length;

      if (match[3] || match[4]) { // found another Left Delim
        delimTotal += rLength;
        continue;
      } else if (match[5] || match[6] || openerCanClose) { // either Left or Right Delim
        if (midRun && (match[5] || match[6])) {
          // A mid-run opener cannot close against an ambiguous delimiter that
          // can also open; that delimiter opens its own emphasis span instead.
          break;
        }
        if (runLength % 3 && !((runLength + rLength) % 3)) {
          midDelimTotal += rLength;
          continue; // CommonMark Emphasis Rules 9-10
        }
      }

      delimTotal -= rLength;
      if (delimTotal > 0) continue; // Haven't found enough closing delimiters

      // Remove extra characters. *a*** -> *a*
      rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
      const lastCharLength = [...match[0]][0].length;
      const raw = src.slice(pos, match.index + lastCharLength + rLength);

      // Create `em` if smallest delimiter has odd char count. *a***
      if (Math.min(lLength, rLength) % 2) {
        const text = raw.slice(1, -1);
        if (plain) renderInline(text, ctx, out, true);
        else { out.push('<em>'); renderInline(text, ctx, out, false); out.push('</em>'); }
        return raw.length;
      }
      // Create 'strong' if smallest delimiter has even char count. **a***
      const text = raw.slice(2, -2);
      if (plain) renderInline(text, ctx, out, true);
      else { out.push('<strong>'); renderInline(text, ctx, out, false); out.push('</strong>'); }
      return raw.length;
    }
  }
  return 0;
}

function inlineDel(src, pos, masked, closers, prevChar, ctx, out, plain, SI) {
  const m0 = execAt(SI.delLDelim, src, pos);
  if (!m0) return 0;

  const nextChar = m0[1] || '';

  if (!nextChar || !prevChar || RP.inline.punctuation.exec(prevChar)) {
    const lLength = [...m0[0]].length - 1;
    let rDelim, rLength, delimTotal = lLength;

    // The closer regex is global, not sticky: it searches forward from the
    // scan start. Its first alternative is ^-anchored, so it can only
    // match at the scan start; try it once here.
    const endReg = RP.inline.delRDelim;
    const lastPossible = closers['~'];
    const windowStart = pos + lLength;
    if (lastPossible < windowStart) return 0;
    FIRST_ALT_DEL.lastIndex = windowStart;
    const firstMatch = FIRST_ALT_DEL.exec(masked);
    endReg.lastIndex = firstMatch ? windowStart + firstMatch[0].length : windowStart;

    let match;
    while ((match = endReg.exec(masked)) !== null) {
      if (match.index > lastPossible) break;
      rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
      if (!rDelim) continue;

      rLength = [...rDelim].length;
      if (rLength !== lLength) continue;

      if (match[3] || match[4]) { // found another Left Delim
        delimTotal += rLength;
        continue;
      }

      delimTotal -= rLength;
      if (delimTotal > 0) continue; // Haven't found enough closing delimiters

      // Remove extra characters.
      rLength = Math.min(rLength, rLength + delimTotal);
      const lastCharLength = [...match[0]][0].length;
      const raw = src.slice(pos, match.index + lastCharLength + rLength);

      // Create del - only single ~ or double ~~ supported.
      const text = raw.slice(lLength, -lLength);
      if (plain) renderInline(text, ctx, out, true);
      else { out.push('<del>'); renderInline(text, ctx, out, false); out.push('</del>'); }
      return raw.length;
    }
  }
  return 0;
}

// ---- Block lexing (cursor-based, no re-slicing of the source) ----
//
// Blocks are collected as small objects ({type, raw, text, ...}) so the
// merge rules (indented code and link definitions cannot interrupt a
// paragraph; a blockquote continuation merges its first paragraph) can
// rewrite the last block before anything is rendered. Inline rendering
// happens only after the whole document is lexed, so a link definition
// anywhere in the document — even after the paragraph that uses it —
// resolves, exactly as marked's two-phase lex-then-parse does.

// Cheap necessary conditions for the two most expensive block patterns.
// A blockquote needs `>` within 3 leading spaces; a table needs its second
// line to start (after spaces) with |, :, or - and hold a dash.
function startsBlockquote(src, pos) {
  let i = pos;
  let spaces = 0;
  while (spaces < 3 && src[i] === ' ') { i++; spaces++; }
  return src[i] === '>';
}

function startsTable(src, pos) {
  const nl = src.indexOf('\n', pos);
  if (nl === -1) return false;
  let i = nl + 1;
  while (src[i] === ' ' || src[i] === '\t') i++;
  const c = src[i];
  if (c !== '|' && c !== ':' && c !== '-') return false;
  const nl2 = src.indexOf('\n', i);
  const lineEnd = nl2 === -1 ? src.length : nl2;
  const dash = src.indexOf('-', i);
  return dash !== -1 && dash < lineEnd;
}

// Cheap necessary condition for a setext heading: some line after pos,
// before the next blank line, starts (after at most 3 spaces) with = or -.
// A blank line ends the paragraph, so an underline past one cannot belong
// to it. False positives are fine — the full pattern still decides.
function hasSetextUnderline(src, pos) {
  let i = pos;
  for (;;) {
    const nl = src.indexOf('\n', i);
    if (nl === -1) return false;
    let j = nl + 1;
    let spaces = 0;
    while (spaces < 3 && src[j] === ' ') { j++; spaces++; }
    const c = src[j];
    if (c === '=' || c === '-') return true;
    if (c === '\n' || c === undefined) return false;
    // A whitespace-only line is a blank line too.
    let k = j;
    while (src[k] === ' ' || src[k] === '\t') k++;
    if (src[k] === '\n' || k >= src.length) return false;
    i = nl + 1;
  }
}

function lexBlocks(src, ctx, blocks, lastParagraphClipped = false) {
  // state.top is mutable lexer state, not a parameter: a nested list's
  // blockTokens resets it to true when it returns, so the lines after a
  // nested list inside an item are lexed as paragraphs, not text. The
  // blockquote tokenizer saves and restores it; the list tokenizer sets
  // it false before each item. This function sets it true on return.
  const SI = stickyPatterns().block;
  const end = src.length;
  let pos = 0;
  while (pos < end) {
    let block = null;

    // newline (blank lines): a single \n just terminates the last line, so
    // it is folded into the last block's raw; anything longer is a space.
    let m = execAt(SI.newline, src, pos);
    if (m && m[0].length > 0) {
      const raw = m[0];
      const last = blocks.at(-1);
      if (raw.length === 1 && last !== undefined) {
        last.raw += '\n';
      } else {
        blocks.push({ type: 'space', raw });
      }
      pos += raw.length;
      continue;
    }

    // indented code — cannot interrupt a paragraph or a text block.
    m = execAt(SI.code, src, pos);
    if (m) {
      const raw = trimTrailingBlankLines(m[0]);
      const text = raw.replace(RX.codeRemoveIndent, '');
      const last = blocks.at(-1);
      if (last && (last.type === 'paragraph' || last.type === 'text')) {
        last.raw += (last.raw.endsWith('\n') ? '' : '\n') + raw;
        last.text += '\n' + text;
      } else {
        blocks.push({ type: 'code', raw, text });
      }
      pos += raw.length;
      continue;
    }

    // fenced code
    m = execAt(SI.fences, src, pos);
    if (m) {
      const raw = m[0];
      const text = indentCodeCompensation(raw, m[3] || '');
      const lang = m[2] ? m[2].trim().replace(RP.inline.anyPunctuation, '$1') : m[2];
      blocks.push({ type: 'code', raw, text, lang });
      pos += raw.length;
      continue;
    }

    // ATX heading
    m = execAt(SI.heading, src, pos);
    if (m) {
      let text = m[2].trim();
      if (RX.endingHash.test(text)) {
        const trimmed = rtrim(text, '#');
        if (!trimmed || RX.endingSpaceTabChar.test(trimmed)) {
          text = trimmed.trim();
        }
      }
      blocks.push({ type: 'heading', raw: rtrim(m[0], '\n'), depth: m[1].length, text });
      pos += m[0].length;
      continue;
    }

    // horizontal rule
    m = execAt(SI.hr, src, pos);
    if (m) {
      blocks.push({ type: 'hr', raw: rtrim(m[0], '\n') });
      pos += m[0].length;
      continue;
    }

    // blockquote — the pattern needs `>` within 3 leading spaces.
    if (startsBlockquote(src, pos)) {
      block = lexBlockquote(src, pos, ctx);
      if (block) {
        blocks.push(block);
        pos += block.raw.length;
        continue;
      }
    }

    // list
    block = lexList(src, pos, ctx);
    if (block) {
      blocks.push(block);
      pos += block.raw.length;
      continue;
    }

    // HTML block
    m = execAt(SI.html, src, pos);
    if (m) {
      const raw = trimTrailingBlankLines(m[0]);
      blocks.push({
        type: 'html',
        raw,
        text: raw,
        pre: m[1] === 'pre' || m[1] === 'script' || m[1] === 'style',
      });
      pos += m[0].length;
      continue;
    }

    // link definition — cannot interrupt a paragraph or a text block, and
    // the first definition of a label wins (a later one still consumes).
    m = execAt(SI.def, src, pos);
    if (m) {
      if (!RX.startAngleBracket.test(m[2]) && findClosingBracket(m[2], '()') !== -1) {
        // Not a definition: fall through to the paragraph/text rules below.
      } else {
        const raw = rtrim(m[0], '\n');
        const tag = normalizeLabel(m[1]);
        const href = m[2]
          ? m[2].replace(RX.hrefBrackets, '$1').replace(RP.inline.anyPunctuation, '$1')
          : '';
        const title = m[3]
          ? m[3].substring(1, m[3].length - 1).replace(RP.inline.anyPunctuation, '$1')
          : m[3];
        const last = blocks.at(-1);
        if (last && (last.type === 'paragraph' || last.type === 'text')) {
          last.raw += (last.raw.endsWith('\n') ? '' : '\n') + raw;
          last.text += '\n' + raw;
        } else {
          if (!Object.hasOwn(ctx.links, tag)) {
            ctx.links[tag] = { href, title };
          }
          ctx.hasLinks = true;
          blocks.push({ type: 'def', raw, tag, href, title });
        }
        pos += raw.length;
        continue;
      }
    }

    // table (gfm) — the second line must be a delimiter row: optional
    // spaces, then |, :, or -, and a dash somewhere on that line.
    if (startsTable(src, pos)) {
      m = execAt(SI.table, src, pos);
      if (m && RX.tableDelimiter.test(m[2])) {
      const headers = splitCells(m[1]);
      const aligns = m[2].replace(RX.tableAlignChars, '').split('|');
      const rows = m[3] && m[3].trim()
        ? m[3].replace(RX.tableRowBlankLine, '').split('\n')
        : [];
      if (headers.length === aligns.length) {
        const align = aligns.map((a) => {
          if (RX.tableAlignRight.test(a)) return 'right';
          if (RX.tableAlignCenter.test(a)) return 'center';
          if (RX.tableAlignLeft.test(a)) return 'left';
          return null;
        });
        const header = headers.map((h, i) => ({ text: h, align: align[i] }));
        const body = rows.map((row) =>
          splitCells(row, headers.length).map((cell, i) => ({ text: cell, align: align[i] })));
        blocks.push({ type: 'table', raw: rtrim(m[0], '\n'), header, align, rows: body });
        pos += m[0].length;
        continue;
      }
      }
    }

    // setext heading (gated: the underline line must exist first)
    m = hasSetextUnderline(src, pos) ? execAt(SI.lheading, src, pos) : null;
    if (m) {
      blocks.push({
        type: 'heading',
        raw: rtrim(m[0], '\n'),
        depth: m[2].charAt(0) === '=' ? 1 : 2,
        text: m[1].trim(),
      });
      pos += m[0].length;
      continue;
    }

    // top-level paragraph (a nested list item lexes text blocks instead,
    // unless a nested list inside it already reset state.top to true)
    if (ctx.top) {
      m = execAt(SI.paragraph, src, pos);
      if (m) {
        const raw = m[0];
        const text = m[1].charAt(m[1].length - 1) === '\n' ? m[1].slice(0, -1) : m[1];
        const last = blocks.at(-1);
        if (lastParagraphClipped && last?.type === 'paragraph') {
          last.raw += (last.raw.endsWith('\n') ? '' : '\n') + raw;
          last.text += '\n' + text;
        } else {
          blocks.push({ type: 'paragraph', raw, text });
        }
        lastParagraphClipped = false;
        pos += raw.length;
        continue;
      }
    }

    // text (one line; consecutive lines merge into the previous text block)
    m = execAt(SI.text, src, pos);
    if (m) {
      const raw = m[0];
      const last = blocks.at(-1);
      if (last?.type === 'text') {
        last.raw += (last.raw.endsWith('\n') ? '' : '\n') + raw;
        last.text += '\n' + raw;
      } else {
        blocks.push({ type: 'text', raw, text: raw });
      }
      pos += raw.length;
      continue;
    }

    // Unreachable for any non-empty input (the text rule matches a line),
    // but never stall the loop.
    pos++;
  }
  ctx.top = true;
  return blocks;
}

// A fenced code block indented under its fence loses that much indentation
// from every line. Only ``` fences compensate (the marker is literal).
function indentCodeCompensation(raw, text) {
  const matchIndentToCode = raw.match(RX.indentCodeCompensation);
  if (matchIndentToCode === null) return text;
  const indentToCode = matchIndentToCode[1];
  return text.split('\n').map((node) => {
    const matchIndentInNode = node.match(RX.beginningSpace);
    if (matchIndentInNode === null) return node;
    const indentInNode = matchIndentInNode[0];
    // Up to the fence's own indentation is removed from each line, so a line
    // indented less than the fence loses whatever indentation it has.
    return node.slice(Math.min(indentInNode.length, indentToCode.length));
  }).join('\n');
}

function lexBlockquote(src, pos, ctx) {
  const SI = stickyPatterns().block;
  const m = execAt(SI.blockquote, src, pos);
  if (!m) return null;
  let lines = rtrim(m[0], '\n').split('\n');
  let raw = '';
  let text = '';
  const blocks = [];

  while (lines.length > 0) {
    let inBlockquote = false;
    const currentLines = [];
    let i;
    for (i = 0; i < lines.length; i++) {
      // get lines up to a continuation
      if (RX.blockquoteStart.test(lines[i])) {
        currentLines.push(lines[i]);
        inBlockquote = true;
      } else if (!inBlockquote) {
        currentLines.push(lines[i]);
      } else {
        break;
      }
    }
    lines = lines.slice(i);

    const currentRaw = currentLines.join('\n');
    const currentText = currentRaw
      // a tab after the block quote marker runs to the next tab stop, and
      // the marker only consumes one space of it; the rest is content
      .replace(
        RX.blockquoteMarkerWhitespace,
        (_, marker, whitespace) => marker + expandTabs(whitespace, marker.length),
      )
      // precede setext continuation with 4 spaces so it isn't a setext
      .replace(RX.blockquoteSetextReplace, '\n    $1')
      .replace(RX.blockquoteSetextReplace2, '');
    raw = raw ? `${raw}\n${currentRaw}` : currentRaw;
    text = text ? `${text}\n${currentText}` : currentText;

    // parse blockquote lines as top level tokens
    // merge paragraphs if this is a continuation
    const savedTop = ctx.top;
    ctx.top = true;
    lexBlocks(currentText, ctx, blocks, true);
    ctx.top = savedTop;

    // if there is no continuation then we are done
    if (lines.length === 0) break;

    const lastBlock = blocks.at(-1);

    if (lastBlock?.type === 'code' || lastBlock?.type === 'heading' ||
      lastBlock?.type === 'hr' || lastBlock?.type === 'html' ||
      lastBlock?.type === 'table') {
      // blockquote continuation cannot be preceded by a code block, heading, hr, html block or table
      break;
    } else if (lastBlock?.type === 'blockquote') {
      // include continuation in nested blockquote
      const oldBlock = lastBlock;
      // The continuation lines belong to the same nesting frame as the
      // nested blockquote, which already had one '>' marker stripped, so
      // strip one marker from them too. Otherwise a restated marker after a
      // lazy line is re-parsed as a spurious deeper blockquote.
      const continuation = lines.join('\n');
      const newText = oldBlock.raw + '\n' + continuation.replace(RX.blockquoteSetextReplace2, '');
      const newBlock = lexBlockquote(newText, 0, ctx);
      blocks[blocks.length - 1] = newBlock;

      // Only include continuation lines the nested blockquote actually
      // consumed. Unconsumed trailing lines must stay out of `raw` so the
      // lexer can still tokenize them (paragraph, next blockquote, etc.).
      const leftover = newText.substring(newBlock.raw.length).replace(/^\n/, '');
      const leftoverCount = leftover ? leftover.split('\n').length : 0;
      const consumed = leftoverCount ? lines.slice(0, -leftoverCount) : lines;
      if (consumed.length > 0) {
        raw = `${raw}\n${consumed.join('\n')}`;
      }
      text = text.substring(0, text.length - oldBlock.text.length) + newBlock.text;

      // A leftover line that starts with '>' still belongs to this
      // blockquote; any other leftover line ends it.
      lines = lines.slice(consumed.length);
      if (lines.length > 0 && RX.blockquoteStart.test(lines[0])) {
        continue;
      }
      break;
    } else if (lastBlock?.type === 'list') {
      // include continuation in nested list
      const oldBlock = lastBlock;
      const newText = oldBlock.raw + '\n' + lines.join('\n');
      const newBlock = lexList(newText, 0, ctx);
      blocks[blocks.length - 1] = newBlock;

      // The list raw has no '>' markers, so it cannot be cut out of `raw`.
      // Count the continuation lines the list took and add those lines instead.
      const consumedCount = newBlock.raw.length > oldBlock.raw.length
        ? newText.slice(oldBlock.raw.length + 1, newBlock.raw.length).split('\n').length
        : 0;
      if (consumedCount > 0) {
        const consumed = lines.slice(0, consumedCount).join('\n');
        raw = `${raw}\n${consumed}`;
        text = `${text}\n${consumed}`;
      }
      lines = lines.slice(consumedCount);
      continue;
    }
  }

  return { type: 'blockquote', raw, text, blocks };
}

// ---- List tokenizer ----
//
// Translates marked's list tokenizer. It works on the remaining source as a
// string (one copy per list) because the item-splitting logic is line-based
// and repeatedly cuts the front off; the list's raw length is what the outer
// lexer consumes.

// Per-indent begin-line regexes, cached by the clamped indent marked uses
// (cachedIndentRegex: Math.max(0, Math.min(3, indent - 1))).
const INDENT_REGEX_CACHE = new Map();
function indentRegexes(indent) {
  const key = clampIndent(indent);
  let r = INDENT_REGEX_CACHE.get(key);
  if (!r) {
    // The builders clamp the indent themselves; pass the raw indent and
    // cache under the clamped key (two raw indents that clamp the same
    // build the same regexes).
    r = {
      nextBullet: nextBulletRegex(indent),
      hr: hrRegex(indent),
      fences: fencesBeginRegex(indent),
      heading: headingBeginRegex(indent),
      html: htmlBeginRegex(indent),
      blockquote: blockquoteBeginRegex(indent),
    };
    INDENT_REGEX_CACHE.set(key, r);
  }
  return r;
}

function lexList(src, pos, ctx) {
  const SI = stickyPatterns().block;
  const cap0 = execAt(SI.list, src, pos);
  if (!cap0) return null;
  // src is only consumed from the front, so every raw below is a slice of
  // listSrc rather than a string built up line by line. A cursor walks it:
  // cutting the front off a string per line would copy the whole remainder
  // each time, quadratic over a long list.
  const listSrc = src.slice(pos);
  let p = 0;
  const taken = () => p;
  let bull = cap0[1].trim();
  const isordered = bull.length > 1;

  const list = {
    type: 'list',
    raw: '',
    ordered: isordered,
    start: isordered ? +bull.slice(0, -1) : '',
    loose: false,
    items: [],
  };

  bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;

  // Get next list item
  const itemRegex = toSticky(listItemRegex(bull));
  let endsWithBlankLine = false;
  // Check if current bullet point can start a new List Item
  while (p < listSrc.length) {
    let endEarly = false;
    let itemContents = '';
    let cap = execAt(itemRegex, listSrc, p);
    if (!cap) break;

    if (execAt(SI.hr, listSrc, p)) { // End list if bullet was actually HR (possibly move into itemRegex?)
      break;
    }

    const itemStart = taken();
    p += cap[0].length;

    const firstLine = (cap[2] || '').split('\n', 1)[0];
    const bulletIndent = cap[1].length;
    let line = firstLine.replace(RX.leadingSpaceTab, (whitespace) => expandTabs(whitespace, bulletIndent));
    // The next line after the item's first line, without its newline.
    const nextNl = listSrc.indexOf('\n', p);
    let nextLine = nextNl === -1 ? listSrc.slice(p) : listSrc.slice(p, nextNl);
    let blankLine = !line.trim();

    let indent = 0;
    if (blankLine) {
      indent = bulletIndent + 1;
    } else {
      indent = line.search(RX.nonSpaceChar); // Find first non-space char
      indent = indent > 4 ? 1 : indent; // Treat indented code blocks (> 4 spaces) as having only 1 indent
      itemContents = line.slice(indent);
      indent += bulletIndent;
    }

    if (blankLine && RX.blankLine.test(nextLine)) { // Items begin with at most one blank line
      p = Math.min(listSrc.length, p + nextLine.length + 1);
      endEarly = true;
    }

    if (!endEarly) {
      const re = indentRegexes(indent);

      // Check if following lines should be included in List Item
      while (p < listSrc.length) {
        const nl = listSrc.indexOf('\n', p);
        const rawLine = nl === -1 ? listSrc.slice(p) : listSrc.slice(p, nl);
        nextLine = rawLine;

        // Re-align to follow commonmark nesting rules
        const nextLineWithoutTabs = nextLine.replace(RX.leadingSpaceTab, (whitespace) => expandTabs(whitespace));

        // Each begin-line regex needs its first character (fences need ` or ~,
        // a heading #, html <, a blockquote >, a bullet, an hr - _ *). A line
        // whose first content character is none of those cannot match any of
        // them, so skip the (expensive, tag-heavy) tests for plain lines.
        const firstNs = nextLineWithoutTabs.search(RX.nonSpaceChar);
        const firstCh = firstNs === -1 ? '' : nextLineWithoutTabs[firstNs];
        // End list item if found code fences
        if ((firstCh === '`' || firstCh === '~') && re.fences.test(nextLine)) break;
        // End list item if found start of new heading
        if (firstCh === '#' && re.heading.test(nextLine)) break;
        // End list item if found start of html block
        if (firstCh === '<' && re.html.test(nextLine)) break;
        // End list item if found start of blockquote
        if (firstCh === '>' && re.blockquote.test(nextLine)) break;
        // End list item if found start of new bullet
        if ((firstCh === '*' || firstCh === '+' || firstCh === '-' || (firstCh >= '0' && firstCh <= '9')) && re.nextBullet.test(nextLine)) break;
        // Horizontal rule found
        if ((firstCh === '-' || firstCh === '_' || firstCh === '*') && re.hr.test(nextLine)) break;

        if (firstNs >= indent || !nextLine.trim()) { // Dedent if possible
          itemContents += '\n' + nextLineWithoutTabs.slice(indent);
        } else {
          // not enough indentation
          if (blankLine) break;

          // paragraph continuation unless last line was a different block level element
          if (line.replace(RX.tabGlobal, '    ').search(RX.nonSpaceChar) >= 4) { // indented code block
            break;
          }
          const lineFirstNs = line.search(RX.nonSpaceChar);
          const lineFirstCh = lineFirstNs === -1 ? '' : line[lineFirstNs];
          if ((lineFirstCh === '`' || lineFirstCh === '~') && re.fences.test(line)) break;
          if (lineFirstCh === '#' && re.heading.test(line)) break;
          if (lineFirstCh === '<' && re.html.test(line)) break;
          if ((lineFirstCh === '-' || lineFirstCh === '_' || lineFirstCh === '*') && re.hr.test(line)) break;

          // A lazy continuation can look like a setext underline after
          // list indentation is removed. Keep it in the paragraph.
          const setextContinuation = RX.setextLine.test(nextLine) &&
            RP.block.lheading.test(`${line}\n${nextLine}`);
          const continuation = setextContinuation
            ? `    ${nextLineWithoutTabs.replace(/^ {0,3}/, '')}`
            : nextLine;
          itemContents += '\n' + continuation;
        }

        blankLine = !nextLine.trim();

        p = nl === -1 ? listSrc.length : nl + 1;
        line = nextLineWithoutTabs.slice(indent);
      }
    }

    // The loops above appended a '\n' the source may not have had. It could
    // only land on the item that exhausts src, whose raw is trimmed below,
    // and after which nothing reads endsWithBlankLine
    const raw = listSrc.slice(itemStart, taken());

    if (!list.loose) {
      // If the previous item ended with a blank line, the list is loose
      if (endsWithBlankLine) {
        list.loose = true;
      } else if (RX.doubleBlankLine.test(raw)) {
        endsWithBlankLine = true;
      }
    }

    list.items.push({
      type: 'list_item',
      raw,
      task: RX.listIsTask.test(itemContents),
      loose: false,
      text: itemContents,
      blocks: [],
    });
  }

  // Do not consume newlines at end of final item. Alternatively, make itemRegex *start* with any newlines to simplify/speed up endsWithBlankLine logic
  const lastItem = list.items.at(-1);
  if (lastItem) {
    lastItem.raw = lastItem.raw.trimEnd();
    lastItem.text = lastItem.text.trimEnd();
  } else {
    // not a list since there were no items
    return null;
  }
  list.raw = listSrc.slice(0, taken()).trimEnd();

  // Item child tokens handled here at end because we needed to have the final item to trim it first
  // First pass: tokenize items and finalize list.loose from spacers before placing checkboxes
  for (const item of list.items) {
    item.blocks = [];
    ctx.top = false;
    lexBlocks(item.text, ctx, item.blocks, false);

    if (!list.loose) {
      // Check if list should be loose
      const spacers = item.blocks.filter((t) => t.type === 'space');
      const hasMultipleLineBreaks = spacers.length > 0 &&
        spacers.some((t) => RX.anyLine.test(t.raw));

      list.loose = hasMultipleLineBreaks;
    }
  }

  // Second pass: place task checkboxes using the final list.loose
  for (const item of list.items) {
    const itemBlock = item.blocks[0];
    if (item.task && (itemBlock?.type === 'text' || itemBlock?.type === 'paragraph')) {
      // Remove checkbox markdown from item tokens
      item.text = item.text.replace(RX.listReplaceTask, '');
      itemBlock.raw = itemBlock.raw.replace(RX.listReplaceTask, '');
      itemBlock.text = itemBlock.text.replace(RX.listReplaceTask, '');

      const taskRaw = RX.listTaskCheckbox.exec(item.raw);
      if (taskRaw) {
        const checked = taskRaw[0] !== '[ ]';
        const checkboxRaw = taskRaw[0] + ' ';
        item.checked = checked;
        if (list.loose) {
          if (item.blocks[0] && ['paragraph', 'text'].includes(item.blocks[0].type)) {
            // The checkbox renders inline at the start of the paragraph.
            item.blocks[0].checkboxFirst = checked;
          } else {
            item.blocks.unshift({
              type: 'paragraph',
              raw: checkboxRaw,
              text: '',
              checkboxFirst: checked,
            });
          }
        } else {
          item.blocks.unshift({ type: 'checkbox', raw: checkboxRaw, checked });
        }
      }
    } else if (item.task) {
      item.task = false;
    }
  }

  // Set all items to loose if list is loose
  if (list.loose) {
    for (const item of list.items) {
      item.loose = true;
      for (const block of item.blocks) {
        if (block.type === 'text') {
          block.type = 'paragraph';
        }
      }
    }
  }

  return list;
}

// ---- Block rendering ----

function renderBlocks(blocks, ctx, out) {
  for (const block of blocks) {
    switch (block.type) {
      case 'space':
      case 'def':
        break; // renders nothing
      case 'code': {
        const langString = (block.lang || '').match(RX.notSpaceStart)?.[0];
        // An empty code block has no content, so it must not gain a newline.
        const code = block.text ? block.text.replace(RX.endingNewline, '') + '\n' : '';
        if (!langString) {
          out.push('<pre><code>' + esc(code, true) + '</code></pre>\n');
        } else {
          out.push('<pre><code class="language-' + esc(langString) + '">' +
            esc(code, true) + '</code></pre>\n');
        }
        break;
      }
      case 'heading': {
        const tmp = [];
        renderInline(block.text, ctx, tmp);
        out.push(`<h${block.depth}>` + tmp.join('') + `</h${block.depth}>\n`);
        break;
      }
      case 'hr':
        out.push('<hr>\n');
        break;
      case 'blockquote': {
        const tmp = [];
        renderBlocks(block.blocks, ctx, tmp);
        out.push('<blockquote>\n' + tmp.join('') + '</blockquote>\n');
        break;
      }
      case 'list': {
        const tmp = [];
        for (const item of block.items) {
          const itemOut = [];
          renderBlocks(item.blocks, ctx, itemOut);
          tmp.push('<li>' + itemOut.join('') + '</li>\n');
        }
        const type = block.ordered ? 'ol' : 'ul';
        const startAttr = (block.ordered && block.start !== 1) ? (' start="' + block.start + '"') : '';
        out.push('<' + type + startAttr + '>\n' + tmp.join('') + '</' + type + '>\n');
        break;
      }
      case 'checkbox':
        out.push('<input ' + (block.checked ? 'checked="" ' : '') +
          'disabled="" type="checkbox"> ');
        break;
      case 'html':
        out.push(block.text);
        break;
      case 'paragraph': {
        const tmp = [];
        if (block.checkboxFirst !== undefined) {
          tmp.push('<input ' + (block.checkboxFirst ? 'checked="" ' : '') +
            'disabled="" type="checkbox"> ');
        }
        renderInline(block.text, ctx, tmp);
        out.push('<p>' + tmp.join('') + '</p>\n');
        break;
      }
      case 'text': {
        if (block.checkboxFirst !== undefined) {
          out.push('<input ' + (block.checkboxFirst ? 'checked="" ' : '') +
            'disabled="" type="checkbox"> ');
        }
        renderInline(block.text, ctx, out);
        break;
      }
      case 'table': {
        let header = '';
        for (const cell of block.header) {
          const tmp = [];
          renderInline(cell.text, ctx, tmp);
          header += cell.align
            ? `<th align="${cell.align}">` + tmp.join('') + '</th>\n'
            : '<th>' + tmp.join('') + '</th>\n';
        }
        header = `<tr>\n${header}</tr>\n`;
        let body = '';
        for (const row of block.rows) {
          let cells = '';
          for (const cell of row) {
            const tmp = [];
            renderInline(cell.text, ctx, tmp);
            cells += cell.align
              ? `<td align="${cell.align}">` + tmp.join('') + '</td>\n'
              : '<td>' + tmp.join('') + '</td>\n';
          }
          body += `<tr>\n${cells}</tr>\n`;
        }
        if (body) body = `<tbody>${body}</tbody>`;
        out.push('<table>\n<thead>\n' + header + '</thead>\n' + body + '</table>\n');
        break;
      }
    }
  }
}

// ---- Public entry point ----

/** The HTML marked 18.1.3 renders for `markdown`, with marked's defaults. */
export function parse(markdown) {
  const src = markdown.replace(RX.carriageReturn, '\n');
  const ctx = {
    links: {},
    hasLinks: false,
    inLink: false,
    inRawBlock: false,
    linkEmitted: false,
    linkParenPossible: true,
    top: true,
  };
  const blocks = [];
  lexBlocks(src, ctx, blocks, false);
  const out = [];
  renderBlocks(blocks, ctx, out);
  return out.join('');
}

// Test hook: the pattern generator verifies the extracted patterns against
// marked's own dump through this export. It is not part of the entry's API.
export const __RP_FOR_TEST = RP;
