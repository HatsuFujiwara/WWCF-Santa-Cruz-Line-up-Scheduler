import { ComprehensiveMetadata } from '../services/musicMetadataService';

export type SongLanguage = 'English' | 'Tagalog' | 'Other / Unknown';

/**
 * Common high-frequency Tagalog / Filipino words and worship terms.
 */
const TAGALOG_WORDS = new Set([
  'ang', 'mga', 'ng', 'sa', 'nang', 'at', 'ay', 'kung', 'pag', 'puso', 'pusong',
  'diyos', 'panginoon', 'dakila', 'biyaya', 'kaligtasan', 'papuri', 'awit', 'awitin',
  'lualhati', 'banal', 'kailanman', 'magpakailanman', 'tapat', 'katapatan', 'lakas',
  'sandigan', 'panata', 'sukdulan', 'sukdulang', 'basag', 'buhay', 'pag-ibig',
  'pagmamahal', 'ikaw', 'siya', 'kami', 'tayo', 'mo', 'ko', 'akin', 'iyo', "sa'yo",
  "sa'kin", 'nagmamahal', 'sumasamba', 'sumasamo', 'gabay', 'tanglaw', 'liwanag',
  'ilaw', 'langit', 'lupa', 'hari', 'kapangyarihan', 'kaharian', 'kabutihan',
  'pagsamba', 'dakilang', 'biyayang', 'tanging', 'haring', 'luwalhati', 'hesus',
  'panginoong', 'walang', 'hanggan', 'sasambahin', 'kay', 'lahat', 'aking', 'iyong',
  'aming', 'ating', 'kanila', 'nila', 'natin', 'namin', 'inyo', 'dito', 'doon',
  'saan', 'paano', 'bakit', 'sino', 'kailan', 'bawat', 'sandali', 'tanging',
  'pagpupuri', 'pagdakila', 'paglilingkod', 'pagpupugay', 'tahanan', 'piling',
  'biyaya', 'krus', 'dugo', 'sala', 'kasalanan', 'patawad', 'buhos', 'ulan',
  'espiritu', 'puspos', 'sigaw', 'sayaw', 'talon', 'alakdan', 'tagumpay', 'wagi',
  'bayan', 'lahing', 'pinili', 'pagpapala', 'pag-asa', 'tayo’y', 'kami’y', 'ikaw’y'
]);

/**
 * Common high-frequency English worship and general words.
 */
const ENGLISH_WORDS = new Set([
  'the', 'and', 'of', 'to', 'in', 'you', 'your', 'lord', 'god', 'jesus',
  'holy', 'praise', 'worship', 'forever', 'grace', 'love', 'glory', 'savior',
  'king', 'worthy', 'mighty', 'faithful', 'father', 'heart', 'life', 'name',
  'great', 'greater', 'heaven', 'earth', 'hallelujah', 'spirit', 'presence',
  'cross', 'light', 'we', 'i', 'my', 'our', 'all', 'is', 'are', 'was', 'were',
  'with', 'for', 'on', 'at', 'by', 'from', 'as', 'be', 'this', 'that', 'have',
  'has', 'will', 'shall', 'sing', 'song', 'shout', 'crown', 'throne', 'mercy',
  'lamb', 'saved', 'redeemed', 'freedom', 'free', 'chains', 'broken', 'higher',
  'highest', 'power', 'majesty', 'blessed', 'blessing', 'forevermore', 'amen'
]);

/**
 * Known Filipino song title phrases / keywords for quick title-based heuristic.
 */
const TAGALOG_TITLE_PHRASES = [
  'pusong basag',
  'sukdulang biyaya',
  'panata',
  'diyos ka sa amin',
  'walang hanggang sasambahin',
  'tapat kailanman',
  'banal mong tahanan',
  'katapatan mo o diyos',
  'kay buti-buti mo',
  'kay buti mo',
  'dakilang katapatan',
  'biyaya mo',
  'haring dakila',
  'bawat pintig',
  'salamat panginoon',
  'papuri sa diyos',
  'ang tanging nais ko',
  'puso ko’y',
  'puso koy',
  'o diyos',
  'o panginoon',
  'sa piling mo',
  'sa krus',
  'tayo ay sumamba',
  'sasambahin kita',
  'walang katulad',
  'wala kang katulad',
  'dakila ka',
  'itaas ang ngalan',
  'kabanal-banalan'
];

/**
 * Tokenizes text into lowercase words.
 */
function tokenizeWords(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/\[.*?\]/g, ' ') // remove lyric section tags like [Verse 1]
    .replace(/[^a-z0-9\s'’\-]/gi, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1);
}

export interface LanguageDetectionResult {
  language: SongLanguage;
  confidence: 'high' | 'medium' | 'low';
  dominantScore: number;
  reason: string;
  tagalogMatchCount: number;
  englishMatchCount: number;
}

/**
 * Detects whether a song's language is English, Tagalog, or Other / Unknown.
 * Follows strict priority:
 * 1. Lyrics is the strongest indicator.
 * 2. Song title & metadata when lyrics are absent.
 * 3. Never rely solely on artist origin (e.g. Filipino artist singing English = English).
 * 4. Cebuano is completely removed and safely treated as Other / Unknown unless lyrics/title support Tagalog or English.
 */
export function detectSongLanguage(
  title: string,
  lyrics?: string,
  metadata?: ComprehensiveMetadata
): LanguageDetectionResult {
  const cleanTitle = (title || '').trim().toLowerCase();
  const cleanLyrics = (lyrics || '').trim();

  // 1. Analyze lyrics if available (Strongest indicator)
  if (cleanLyrics && cleanLyrics.length > 30) {
    const tokens = tokenizeWords(cleanLyrics);
    let tagalogCount = 0;
    let englishCount = 0;

    for (const token of tokens) {
      if (TAGALOG_WORDS.has(token)) tagalogCount++;
      if (ENGLISH_WORDS.has(token)) englishCount++;
    }

    const totalIdentified = tagalogCount + englishCount;

    if (totalIdentified >= 4) {
      const tagalogRatio = tagalogCount / totalIdentified;
      const englishRatio = englishCount / totalIdentified;

      if (tagalogRatio >= 0.58) {
        return {
          language: 'Tagalog',
          confidence: totalIdentified >= 10 ? 'high' : 'medium',
          dominantScore: Math.round(tagalogRatio * 100),
          reason: `Detected Tagalog based on lyrics vocabulary (${tagalogCount} Tagalog indicators vs ${englishCount} English).`,
          tagalogMatchCount: tagalogCount,
          englishMatchCount: englishCount
        };
      } else if (englishRatio >= 0.58) {
        return {
          language: 'English',
          confidence: totalIdentified >= 10 ? 'high' : 'medium',
          dominantScore: Math.round(englishRatio * 100),
          reason: `Detected English based on lyrics vocabulary (${englishCount} English indicators vs ${tagalogCount} Tagalog).`,
          tagalogMatchCount: tagalogCount,
          englishMatchCount: englishCount
        };
      } else {
        return {
          language: 'Other / Unknown',
          confidence: 'low',
          dominantScore: 50,
          reason: `Mixed multilingual lyrics without a clear dominant language (${tagalogCount} Tagalog, ${englishCount} English).`,
          tagalogMatchCount: tagalogCount,
          englishMatchCount: englishCount
        };
      }
    }
  }

  // 2. Analyze title
  for (const phrase of TAGALOG_TITLE_PHRASES) {
    if (cleanTitle.includes(phrase)) {
      return {
        language: 'Tagalog',
        confidence: 'high',
        dominantScore: 90,
        reason: `Title contains recognizable Tagalog worship title pattern ("${phrase}").`,
        tagalogMatchCount: 1,
        englishMatchCount: 0
      };
    }
  }

  const titleTokens = tokenizeWords(cleanTitle);
  let titleTagalog = 0;
  let titleEnglish = 0;

  for (const t of titleTokens) {
    if (TAGALOG_WORDS.has(t)) titleTagalog++;
    if (ENGLISH_WORDS.has(t)) titleEnglish++;
  }

  if (titleTagalog > 0 && titleTagalog >= titleEnglish) {
    return {
      language: 'Tagalog',
      confidence: titleTagalog >= 2 ? 'high' : 'medium',
      dominantScore: 80,
      reason: `Song title contains Tagalog words.`,
      tagalogMatchCount: titleTagalog,
      englishMatchCount: titleEnglish
    };
  }

  if (titleEnglish > 0 && titleEnglish > titleTagalog) {
    return {
      language: 'English',
      confidence: titleEnglish >= 2 ? 'high' : 'medium',
      dominantScore: 80,
      reason: `Song title contains English words.`,
      tagalogMatchCount: titleTagalog,
      englishMatchCount: titleEnglish
    };
  }

  // 3. Fallback to metadata hints if provided
  if (metadata?.language) {
    const metaLang = metadata.language.toLowerCase();
    if (metaLang.includes('tagalog') || metaLang.includes('filipino')) {
      return {
        language: 'Tagalog',
        confidence: 'medium',
        dominantScore: 70,
        reason: `Metadata source indicated Tagalog language.`,
        tagalogMatchCount: 0,
        englishMatchCount: 0
      };
    }
    if (metaLang.includes('english')) {
      return {
        language: 'English',
        confidence: 'medium',
        dominantScore: 70,
        reason: `Metadata source indicated English language.`,
        tagalogMatchCount: 0,
        englishMatchCount: 0
      };
    }
  }

  // 4. Default to Other / Unknown if not enough evidence
  return {
    language: 'Other / Unknown',
    confidence: 'low',
    dominantScore: 0,
    reason: `Insufficient linguistic markers in title or lyrics to confidently classify language.`,
    tagalogMatchCount: 0,
    englishMatchCount: 0
  };
}

/**
 * Sanitizes existing stored language values, safely migrating legacy "Cebuano"
 * or missing strings to standard 'English' | 'Tagalog' | 'Other / Unknown'.
 */
export function sanitizeSongLanguage(lang?: string): SongLanguage {
  if (!lang) return 'Other / Unknown';
  const clean = lang.trim().toLowerCase();
  if (clean === 'english') return 'English';
  if (clean === 'tagalog' || clean === 'filipino') return 'Tagalog';
  if (clean === 'cebuano' || clean === 'other' || clean === 'unknown' || clean === 'other / unknown') {
    return 'Other / Unknown';
  }
  return 'Other / Unknown';
}
