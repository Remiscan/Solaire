export let seed;
export let mt;

function randomSeed() {
  return Math.floor(Number.MAX_SAFE_INTEGER * Math.random());
}

export function updateSeed(number = randomSeed()) {
  seed = number;
  mt = new MersenneTwister(number);
}