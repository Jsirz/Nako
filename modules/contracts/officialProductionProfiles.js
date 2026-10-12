// Shared identity only. Provider fields and executable tools remain server-owned.
export const OFFICIAL_PRODUCTION_PROFILES = Object.freeze([
  Object.freeze({ id: 'minimax-drama', slug: 'minimax-drama-prompt', version: '1.0.0', mode: 'script', webAppId: '2094859983199498241' }),
  Object.freeze({ id: 'minimax-fight', slug: 'minimax-fight-assets', version: '1.0.0', mode: 'assets', webAppId: '2094873524119883778' }),
]);
export const productionProfileForSkill = (slug) => OFFICIAL_PRODUCTION_PROFILES.find((profile) => profile.slug === slug);
export const productionProfileForBundle = (id) => OFFICIAL_PRODUCTION_PROFILES.find((profile) => profile.id === id);
