let seed;
export let mt;



export class Seed {
  constructor(number) {
    const temp = (typeof number !== 'undefined') ? number : Seed.random();
    if (!Seed.validate(temp)) {
      console.error(`Bad seed: ${temp} (from ${number})`);
      throw 'Bad seed';
    }
    this.seed = Number(temp);
    seed = this.seed;
    mt = new MersenneTwister(this.seed);
  }


  static validate(code) {
    if (!code && code != 0) return false;
    if (!isNaN(code)) return true;
    else              return false;
  }


  static random() {
    return Math.floor(Number.MAX_SAFE_INTEGER * Math.random());
  }


  static get current() {
    return seed;
  }
}