export const docCalls: Record<'rank' | 'decide_batch', Record<string, unknown>> = {
  rank: {
    texts: ['The app is slow to start', 'How do I update my credit card?', 'Where can I download my invoice?'],
    criterion: 'questions about billing and payments',
  },
  decide_batch: {
    texts: ['The page crashes as soon as it loads', 'Please add a dark theme'],
    heads: { kind: ['bug report', 'feature request'] },
  },
}
