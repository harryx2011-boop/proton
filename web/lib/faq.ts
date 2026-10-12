export interface Faq {
  id: string
  question: string
  answer: string
}

export const faq: Faq[] = [
  {
    id: 'what-it-runs-on',
    question: 'What Does Proton Run On?',
    answer:
      'Your own computer, on the processor alone. It needs no graphics card and about 0.68 GB of memory while it runs. This release supports Windows x64 with VS Code.',
  },
  {
    id: 'privacy',
    question: 'Does My Text Leave My Computer?',
    answer:
      'No. Proton answers on 127.0.0.1, an address that only your computer can reach. The one download is the set of model files on first start.',
  },
  {
    id: 'language-model',
    question: 'How Is This Different From a Language Model?',
    answer:
      'A language model writes new text. Proton does not write anything: it picks from labels you provide. That narrow job is why it answers in tens of milliseconds on a processor.',
  },
  {
    id: 'trust',
    question: 'Can I Trust Its Answers?',
    answer:
      'Treat them as a fast first check. In our own tests the right skill was among the top three picks in 27 of 28 tasks, and it also rated "rm -rf" on a build folder as a read. Pair it with real safeguards, especially for risky actions.',
  },
  {
    id: 'windows-only',
    question: 'Why Windows Only?',
    answer: 'This release bundles the runtime files for Windows x64 only. Other systems are not supported yet.',
  },
  {
    id: 'remove',
    question: 'How Do I Remove It?',
    answer: 'Uninstall the Proton extension in VS Code, then delete the models folder at %LOCALAPPDATA%\\Proton\\models.',
  },
  {
    id: 'models',
    question: 'Which Models Does It Use?',
    answer: 'Three small open models. Each one is named, with a link, in the credits on the home page.',
  },
]
