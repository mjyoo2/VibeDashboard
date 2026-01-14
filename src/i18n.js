/**
 * Internationalization support for VibeDashboard
 */

const translations = {
  en: {
    title: 'Vibe Coding Stats',
    dashboardTitle: 'Vibe Coding Dashboard',
    totalTokens: 'Total Tokens',
    totalCost: 'Total Cost',
    dailyAverage: 'Daily Average',
    topModel: 'Top Model',
    lastDays: 'Last {n} Days',
    weeklyUsage: 'Weekly Usage',
    modelBreakdown: 'Model Breakdown',
    updated: 'Updated',
    tokens: 'tokens',
    poweredBy: 'Powered by',
    // Period labels
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    allTime: 'All Time',
    periodUsage: '{period} Usage',
    // Multi-source labels
    sources: 'Sources',
    mergedFrom: 'Merged from {n} sources'
  },
  ko: {
    title: 'Vibe 코딩 통계',
    dashboardTitle: 'Vibe 코딩 대시보드',
    totalTokens: '총 토큰',
    totalCost: '총 비용',
    dailyAverage: '일 평균',
    topModel: '주요 모델',
    lastDays: '최근 {n}일',
    weeklyUsage: '주간 사용량',
    modelBreakdown: '모델별 사용량',
    updated: '업데이트',
    tokens: '토큰',
    poweredBy: 'Powered by',
    // Period labels
    today: '오늘',
    thisWeek: '이번 주',
    thisMonth: '이번 달',
    allTime: '전체 기간',
    periodUsage: '{period} 사용량',
    // Multi-source labels
    sources: '소스',
    mergedFrom: '{n}개 소스에서 병합됨'
  },
  ja: {
    title: 'Vibe コーディング統計',
    dashboardTitle: 'Vibe コーディングダッシュボード',
    totalTokens: '総トークン',
    totalCost: '総コスト',
    dailyAverage: '日平均',
    topModel: '主要モデル',
    lastDays: '過去{n}日間',
    weeklyUsage: '週間使用量',
    modelBreakdown: 'モデル別内訳',
    updated: '更新日時',
    tokens: 'トークン',
    poweredBy: 'Powered by',
    // Period labels
    today: '今日',
    thisWeek: '今週',
    thisMonth: '今月',
    allTime: '全期間',
    periodUsage: '{period}の使用量',
    // Multi-source labels
    sources: 'ソース',
    mergedFrom: '{n}ソースから統合'
  }
};

/**
 * Get translation for a key
 * @param {string} key - Translation key
 * @param {string} lang - Language code (en, ko, ja)
 * @param {object} params - Parameters for interpolation
 * @returns {string} Translated string
 */
export function t(key, lang = 'en', params = {}) {
  const langStrings = translations[lang] || translations.en;
  let text = langStrings[key] || translations.en[key] || key;

  // Replace placeholders like {n} with values from params
  for (const [param, value] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
  }

  return text;
}

/**
 * Get all translations for a language
 * @param {string} lang - Language code
 * @returns {object} All translations for the language
 */
export function getTranslations(lang = 'en') {
  return translations[lang] || translations.en;
}

/**
 * Check if a language is supported
 * @param {string} lang - Language code
 * @returns {boolean} Whether the language is supported
 */
export function isLanguageSupported(lang) {
  return lang in translations;
}

/**
 * Get list of supported languages
 * @returns {string[]} Array of language codes
 */
export function getSupportedLanguages() {
  return Object.keys(translations);
}

export default { t, getTranslations, isLanguageSupported, getSupportedLanguages };
