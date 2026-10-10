export const faqTopics = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'payments', label: 'Payments' },
  { id: 'devices', label: 'Devices' },
  { id: 'delivery', label: 'Delivery' },
] as const;
export type FaqTopic = typeof faqTopics[number]['id'];
export type FaqTopicFilter = FaqTopic | 'all';
export type FaqEntry = { id: string; topic: FaqTopic; question: string; answer: string; keywords?: string[] };

export const faqs: readonly FaqEntry[] = [
  {
    id: 'paluwagan', topic: 'getting-started',
    question: 'What is the Fresh Phones PH paluwagan?',
    answer: "It's a friendly, flexible way to own an iPhone or iPad. Instead of paying the full price upfront, you pay in small amounts on a schedule that suits you, until the device is yours.",
  },
  {
    id: 'legitimacy', topic: 'getting-started',
    question: "Is this legit? How do I know I won't get scammed?",
    answer: "Fresh Phones PH is DTI registered under FP Gadget Center and owned by Mr. Dale John Garcia Tambong. This is our official and only page. Message us anytime and we'll gladly answer your questions.",
  },
  {
    id: 'device-condition', topic: 'devices',
    question: 'Are the devices pre-owned or brand new?',
    answer: 'Both! We offer quality pre-owned units and brand-new units. Every device is tested, checked, and in excellent condition before it reaches you.',
    keywords: ['preowned', 'secondhand'],
  },
  {
    id: 'payment-options', topic: 'payments',
    question: 'What payment options do you offer?',
    answer: 'Payment amounts and intervals depend on the offer. View a unit’s sample payment breakdown for its total, installments and example dates, then confirm the terms with our team. Payments are made externally through GCash, Maya, or bank transfer.',
    keywords: ['weekly', 'monthly', 'schedule'],
  },
  {
    id: 'sell-device', topic: 'devices',
    question: 'Do you buy old devices?',
    answer: "Yes, we buy units! If you have an old iPhone or iPad, message us with the details and we'll give you a fair quote.",
  },
  {
    id: 'receive-device', topic: 'delivery',
    question: 'How do I receive my device?',
    answer: "We deliver fast and smooth, right to your doorstep. Just message our page and we'll walk you through the whole process.",
  },
];

function normalize(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function filterFaqs(query: string, topic: FaqTopicFilter = 'all'): readonly FaqEntry[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (query.trim() && words.length === 0) return [];
  return faqs.filter(entry => {
    if (topic !== 'all' && entry.topic !== topic) return false;
    const label = faqTopics.find(candidate => candidate.id === entry.topic)!.label;
    const searchable = normalize([entry.question, entry.answer, label, ...(entry.keywords ?? [])].join(' '));
    return words.every(word => searchable.includes(word));
  });
}
