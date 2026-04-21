// PWA-canonical interest list (lines 371–387 of Eru_Consumer_PWA.html).
// 15 categories. The first 5 use accent colors when selected; the rest go
// gray-outlined → category color when picked. Order matters — preserved.
export const INTERESTS = [
  { key: 'food', label: 'Food', emoji: '🍜', color: '#E8792B' },
  { key: 'tech', label: 'Tech', emoji: '💻', color: '#2563EB' },
  { key: 'travel', label: 'Travel', emoji: '✈️', color: '#0D9488' },
  { key: 'books', label: 'Books', emoji: '📚', color: '#7C3AED' },
  { key: 'fitness', label: 'Fitness', emoji: '🏋️', color: '#10B981' },
  { key: 'cinema', label: 'Cinema', emoji: '🎬', color: '#EC4899' },
  { key: 'music', label: 'Music', emoji: '🎵', color: '#737373' },
  { key: 'cricket', label: 'Cricket', emoji: '🏏', color: '#737373' },
  { key: 'photography', label: 'Photography', emoji: '📷', color: '#737373' },
  { key: 'art', label: 'Art', emoji: '🎨', color: '#737373' },
  { key: 'lifestyle', label: 'Lifestyle', emoji: '🏡', color: '#737373' },
  { key: 'finance', label: 'Finance', emoji: '💰', color: '#737373' },
  { key: 'fashion', label: 'Fashion', emoji: '👗', color: '#737373' },
  { key: 'gaming', label: 'Gaming', emoji: '🎮', color: '#737373' },
  { key: 'wellness', label: 'Wellness', emoji: '🧘', color: '#737373' },
] as const;

export type InterestKey = (typeof INTERESTS)[number]['key'];

// PWA-canonical language pills (lines 395–399 of Eru_Consumer_PWA.html).
// 5 languages. Native scripts shown for non-English entries.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const PERSONALIZE_BONUS_THRESHOLD = 5;
export const PERSONALIZE_BONUS_POINTS = 50;
