// Mojimon word bank.
// Each word: [word, picture file in img/words/ (without .svg)]
// Most pictures are Twemoji files named by their emoji code. Add or change words here.
window.MOJI_WORDS = {
  a: [["apple", "1f34e"], ["ant", "1f41c"], ["airplane", "2708"]],
  b: [["banana", "1f34c"], ["bear", "1f43b"], ["bus", "1f68c"], ["book", "1f4d6"], ["bee", "1f41d"]],
  c: [["cat", "1f431"], ["cake", "1f370"], ["car", "1f697"], ["cow", "1f42e"], ["carrot", "1f955"]],
  d: [["dog", "1f436"], ["duck", "1f986"], ["donut", "1f369"], ["dolphin", "1f42c"]],
  e: [["egg", "1f95a"], ["elephant", "1f418"], ["ear", "1f442"]],
  f: [["fish", "1f41f"], ["frog", "1f438"], ["fox", "1f98a"], ["flower", "1f337"]],
  g: [["grapes", "1f347"], ["gorilla", "1f98d"], ["guitar", "1f3b8"], ["gift", "1f381"]],
  h: [["hat", "1f3a9"], ["horse", "1f434"], ["house", "1f3e0"], ["hamburger", "1f354"]],
  i: [["ice cream", "1f366"], ["ice", "1f9ca"], ["island", "1f3dd"]],
  j: [["juice", "1f9c3"], ["jellyfish", "1fabc"], ["jeans", "1f456"], ["jacket", "1f9e5"]],
  k: [["koala", "1f428"], ["key", "1f511"], ["kite", "1fa81"], ["king", "1f934"], ["kangaroo", "1f998"]],
  l: [["lion", "1f981"], ["lemon", "1f34b"], ["leaf", "1f343"], ["lollipop", "1f36d"]],
  m: [["monkey", "1f435"], ["milk", "1f95b"], ["moon", "1f319"], ["mouse", "1f42d"], ["melon", "1f348"]],
  n: [["nose", "1f443"], ["nest", "1faba"], ["nine", "39-20e3"], ["notebook", "1f4d3"]],
  o: [["octopus", "1f419"], ["orange", "1f34a"], ["owl", "1f989"], ["onion", "1f9c5"]],
  p: [["pig", "1f437"], ["panda", "1f43c"], ["pizza", "1f355"], ["penguin", "1f427"], ["pineapple", "1f34d"]],
  q: [["queen", "1f478"], ["question", "2753"], ["quiet", "1f92b"]],
  r: [["rabbit", "1f430"], ["rainbow", "1f308"], ["robot", "1f916"], ["rice", "1f35a"], ["rocket", "1f680"]],
  s: [["sun", "2600"], ["star", "2b50"], ["snake", "1f40d"], ["strawberry", "1f353"], ["sushi", "1f363"]],
  t: [["tiger", "1f42f"], ["tomato", "1f345"], ["train", "1f686"], ["tree", "1f333"], ["turtle", "1f422"]],
  u: [["umbrella", "2602"], ["unicorn", "1f984"], ["up", "2b06"]],
  v: [["violin", "1f3bb"], ["volcano", "1f30b"], ["van", "1f690"], ["volleyball", "1f3d0"]],
  w: [["watermelon", "1f349"], ["whale", "1f433"], ["watch", "231a"], ["wolf", "1f43a"]],
  x: [["X-ray", "1fa7b"], ["xylophone", "xylophone"], ["Xmas tree", "1f384"]],
  y: [["yo-yo", "1fa80"], ["yellow", "1f7e8"], ["yen", "1f4b4"]],
  z: [["zebra", "1f993"], ["zero", "30-20e3"], ["zombie", "1f9df"]]
};

// Letters whose words sound alike or that Japanese learners often mix up.
// Words from these letters are never used as wrong answers for each other.
window.MOJI_CONFUSABLE = {
  c: "ksq", k: "cq", q: "kc", s: "cz", z: "s", g: "j", j: "g",
  l: "r", r: "l", b: "v", v: "b", u: "y", y: "u", x: "e", e: "x", i: "a", a: "i"
};
