// Original credit: https://gist.github.com/rviscomi/1479649

export function generateLipsum(numChars: number) {
  const averageWordSize = 3; // arbitrary, needs to be below average though
  const lipsum = new LoremIpsum().generate(
    Math.max(Math.ceil(numChars / averageWordSize), 2)
  );
  return lipsum.substring(0, numChars);
}

class LoremIpsum {
  generate(numWords: number) {
    let num_words = numWords;

    num_words = num_words || 100;

    const generatedWords = [words[0], words[1]];
    num_words -= 2;

    for (let ii = 0; ii < num_words; ii++) {
      const position = Math.floor(Math.random() * words.length);
      const word = words[position];

      if (ii > 0 && words[ii - 1] === word) {
        ii -= 1;
      } else {
        generatedWords[ii] = word;
      }
    }

    const sentences = [];
    let current = 0;

    while (num_words > 0) {
      let sentence_length = this.getRandomSentenceLength();

      if (num_words - sentence_length < 4) {
        sentence_length = num_words;
      }

      num_words -= sentence_length;

      let sentence = [];

      for (let ii = current; ii < current + sentence_length; ii++) {
        sentence.push(words[ii]);
      }

      sentence = this.punctuate(sentence);
      current += sentence_length;
      sentences.push(sentence.join(" "));
    }

    return sentences.join(" ");
  }

  punctuate(sentence: string[]) {
    let word_length;
    let num_commas;
    let ii;
    let position;

    word_length = sentence.length;

    /* End the sentence with a period. */
    sentence[word_length - 1] += ".";

    if (word_length < 4) {
      return sentence;
    }

    num_commas = this.getRandomCommaCount(word_length);

    for (ii = 0; ii <= num_commas; ii++) {
      position = Math.round((ii * word_length) / (num_commas + 1));

      if (position < word_length - 1 && position > 0) {
        /* Add the comma. */
        sentence[position] += ",";
      }
    }

    /* Capitalize the first word in the sentence. */
    sentence[0] = sentence[0].charAt(0).toUpperCase() + sentence[0].slice(1);

    return sentence;
  }

  getRandomCommaCount(word_length: number) {
    let base;
    let average;
    let standard_deviation;

    /* Arbitrary. */
    base = 6;

    average = Math.log(word_length) / Math.log(base);
    standard_deviation = average / base;

    return Math.round(this.gaussMS(average, standard_deviation));
  }

  getRandomSentenceLength() {
    return Math.round(
      this.gaussMS(words_PER_SENTENCE_AVG, words_PER_SENTENCE_STD)
    );
  }

  gauss() {
    return (
      Math.random() * 2 - 1 + (Math.random() * 2 - 1) + (Math.random() * 2 - 1)
    );
  }

  gaussMS(mean: number, standard_deviation: number) {
    return Math.round(this.gauss() * standard_deviation + mean);
  }
}

const words_PER_SENTENCE_AVG = 24.46;

const words_PER_SENTENCE_STD = 5.08;

const words = [
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "curabitur",
  "vel",
  "hendrerit",
  "libero",
  "eleifend",
  "blandit",
  "nunc",
  "ornare",
  "odio",
  "ut",
  "orci",
  "gravida",
  "imperdiet",
  "nullam",
  "purus",
  "lacinia",
  "a",
  "pretium",
  "quis",
  "congue",
  "praesent",
  "sagittis",
  "laoreet",
  "auctor",
  "mauris",
  "non",
  "velit",
  "eros",
  "dictum",
  "proin",
  "accumsan",
  "sapien",
  "nec",
  "massa",
  "volutpat",
  "venenatis",
  "sed",
  "eu",
  "molestie",
  "lacus",
  "quisque",
  "porttitor",
  "ligula",
  "dui",
  "mollis",
  "tempus",
  "at",
  "magna",
  "vestibulum",
  "turpis",
  "ac",
  "diam",
  "tincidunt",
  "id",
  "condimentum",
  "enim",
  "sodales",
  "in",
  "hac",
  "habitasse",
  "platea",
  "dictumst",
  "aenean",
  "neque",
  "fusce",
  "augue",
  "leo",
  "eget",
  "semper",
  "mattis",
  "tortor",
  "scelerisque",
  "nulla",
  "interdum",
  "tellus",
  "malesuada",
  "rhoncus",
  "porta",
  "sem",
  "aliquet",
  "et",
  "nam",
  "suspendisse",
  "potenti",
  "vivamus",
  "luctus",
  "fringilla",
  "erat",
  "donec",
  "justo",
  "vehicula",
  "ultricies",
  "varius",
  "ante",
  "primis",
  "faucibus",
  "ultrices",
  "posuere",
  "cubilia",
  "curae",
  "etiam",
  "cursus",
  "aliquam",
  "quam",
  "dapibus",
  "nisl",
  "feugiat",
  "egestas",
  "class",
  "aptent",
  "taciti",
  "sociosqu",
  "ad",
  "litora",
  "torquent",
  "per",
  "conubia",
  "nostra",
  "inceptos",
  "himenaeos",
  "phasellus",
  "nibh",
  "pulvinar",
  "vitae",
  "urna",
  "iaculis",
  "lobortis",
  "nisi",
  "viverra",
  "arcu",
  "morbi",
  "pellentesque",
  "metus",
  "commodo",
  "ut",
  "facilisis",
  "felis",
  "tristique",
  "ullamcorper",
  "placerat",
  "aenean",
  "convallis",
  "sollicitudin",
  "integer",
  "rutrum",
  "duis",
  "est",
  "etiam",
  "bibendum",
  "donec",
  "pharetra",
  "vulputate",
  "maecenas",
  "mi",
  "fermentum",
  "consequat",
  "suscipit",
  "aliquam",
  "habitant",
  "senectus",
  "netus",
  "fames",
  "quisque",
  "euismod",
  "curabitur",
  "lectus",
  "elementum",
  "tempor",
  "risus",
  "cras"
];
