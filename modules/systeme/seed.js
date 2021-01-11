let seed;
export let mt;



export class Seed {
  constructor(number) {
    this.seed = (typeof number !== 'undefined') ? number : Seed.random();
    seed = this.seed;
    mt = new MersenneTwister(this.seed);
  }

  static random() {
    return Math.floor(Number.MAX_SAFE_INTEGER * Math.random());
  }

  static get() {
    return seed;
  }
}