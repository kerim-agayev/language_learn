# Content file format

One JSON file per topic: content/<LEVEL>/<NN>-<slug>.json. Files are served in filename order, items in array order.

```json
{
  "topic": "Selamlaşma",
  "items": [
    {
      "type": "WORD",
      "en": "hello",
      "tr": "merhaba",
      "ipa": "/həˈləʊ/",
      "pos": "interjection",
      "example": "Hello! Nice to meet you.",
      "exampleTr": "Merhaba! Tanıştığıma memnun oldum.",
      "emoji": "👋",
      "imageQuery": null,
      "note": null
    }
  ]
}
```

- type: WORD | CHUNK (everyday phrase / conversation pattern) | PHRASAL (phrasal verb) | SENTENCE (sentence pattern)
- en: the item itself. For SENTENCE use the pattern with a short real example, e.g. "I've been waiting for ages."
- tr: natural Türkiye Türkçesi meaning (short, comma-separated alternatives ok)
- ipa: British IPA for WORD and PHRASAL, null otherwise
- pos: noun | verb | adjective | adverb | preposition | pronoun | conjunction | interjection | determiner — WORD only, else null
- example: ONE natural everyday spoken English sentence that contains `en` (exact form or obvious inflection). No academic/formal register.
- exampleTr: natural Turkish translation of example
- emoji: one fitting emoji (always)
- imageQuery: 1-3 English words for a stock photo search, ONLY if the item is concretely picturable (apple, kitchen, run, rainy). null for abstract things.
- note: optional short Turkish usage tip (max ~100 chars), mostly for CHUNK/PHRASAL/SENTENCE. null otherwise.
