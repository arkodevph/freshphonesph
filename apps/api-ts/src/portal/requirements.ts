export const requirements = [
  { key: 'PHOTO_ID', label: 'Valid photo ID', description: 'A clear image or PDF of one valid government-issued photo ID.' },
  { key: 'SIGNED_AGREEMENT', label: 'Signed client agreement', description: 'The signed Fresh Phones PH client agreement provided to you by Records.' },
] as const;

export function requirement(key: string) {
  return requirements.find((item) => item.key === key);
}
