# Content file format

One JSON file per topic: content/<LEVEL>/<NN>-<slug>.json. Files are served in filename order, items in array order.

## Teaching philosophy (read this first)
We teach English the way a native child picks it up before school: a 5–6 year old English child can't read
books, but speaks fluently. So:
- **Spoken, everyday, high-frequency first.** Concrete things a child sees, does and hears every day before abstract ones.
- **Chunks, phrasal verbs and collocations come early and naturally**, exactly when a child would hear them
  ("come here", "put your shoes on", "brush your teeth", "all gone", "be careful"). Children don't learn
  "put on" after "wear" — they learn "put on" first.
- **Immersion (Rosetta Stone):** a picture + sound + simple English should be enough to understand the item.
  The Turkish translation is a backup, not the main path.
- **Feynman technique:** every item gets `simple` — the item explained the way you'd explain it to a 5-year-old,
  in very simple English using only easier words than the item itself.

```json
{
  "topic": "Selamlaşma",
  "items": [
    {
      "type": "WORD",
      "en": "hungry",
      "tr": "aç",
      "ipa": "/ˈhʌŋ.ɡri/",
      "pos": "adjective",
      "example": "I'm hungry. Can I have a sandwich?",
      "exampleTr": "Acıktım. Bir sandviç alabilir miyim?",
      "simple": "When you are hungry, you want to eat. Your tummy feels empty.",
      "emoji": "😋",
      "imageQuery": "hungry child eating",
      "note": null
    }
  ]
}
```

- type: WORD | CHUNK (everyday phrase / conversation pattern) | PHRASAL (phrasal verb) | SENTENCE (sentence pattern)
  | COLLOCATION (natural word partnership: "brush your teeth", "make a mistake", "heavy rain", "catch a cold")
- en: the item itself. For SENTENCE use the pattern with a short real example, e.g. "I've been waiting for ages."
- tr: natural Türkiye Türkçesi meaning (short, comma-separated alternatives ok)
- ipa: British IPA for WORD, PHRASAL and COLLOCATION; null otherwise
- pos: noun | verb | adjective | adverb | preposition | pronoun | conjunction | interjection | determiner — WORD only, else null
- example: ONE natural everyday spoken English sentence that contains `en` (exact form or obvious inflection). No academic/formal register.
- exampleTr: natural Turkish translation of example
- simple: 1–2 short sentences (≤ 20 words total) in very simple English, explaining the item like to a 5-year-old.
  Use only words easier than the item; don't use the item itself if avoidable; no Turkish.
- emoji: one fitting emoji (always)
- imageQuery: 1-3 English words for a stock photo search, ONLY if the item is concretely picturable (apple, kitchen, run, rainy). null for abstract things.
- note: optional short Turkish usage tip (max ~100 chars), mostly for CHUNK/PHRASAL/SENTENCE/COLLOCATION. null otherwise.
