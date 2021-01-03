const {chat: {sanitize}} = OMEGGA_UTIL;

const charSpace = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
];

const gauss = () => (
  Math.random()+Math.random()+Math.random()+Math.random()+
  Math.random()+Math.random()+Math.random()+Math.random()+
  Math.random()+Math.random()+Math.random()+Math.random()
)/12-0.5;

const garble = (m, amt=4) => {
  let message = m.split('');
  for (let i = 0; i < m.length; i++) {
    const char = m[i];
    const space = charSpace.find(s => s.includes(char));
    if (!space) {
      continue;
    } else {
      // garble by shift
      const index = space.indexOf(char);
      // message[i] = space[(index + Math.round(gauss() * amt) + space.length * 10) % space.length];

      const swapIndex = Math.max(0, Math.min(Math.round(i + gauss() * amt), m.length));
      const temp = message[i];
      message[i] = message[swapIndex];
      message[swapIndex] = temp;
    }
  }
  return message.join('');
};

module.exports = class Garbler {
  constructor(omegga, config, store) {
    this.omegga = omegga;
    this.config = config;
    this.store = store;

    this.promise;
    this.getting = false;
    this.lastPosTime = 0;
    this.lastPos = [];
  }

  // get player positions safely asynchronously
  async getPositions() {
    if (this.getting)
      return await this.promise;
    if (this.lastPosTime + 200 > Date.now())
      return this.lastPos;
    this.getting = true;
    let res;
    this.promise = new Promise(resolve => {res = resolve;});
    const pos = await Omegga.getAllPlayerPositions();
    this.lastPosTime = Date.now();
    this.getting = false;
    res(pos);
    return pos;
  }

  async init() {
    Omegga.on('chat', async (name, message) => {
      let pos = [];
      try {
        pos = await this.getPositions();
      } catch (e) {
        console.error(e);
      }

      // speaking player name info
      const nameColor = Omegga.getPlayer(name).getNameColor();
      //  const nameText = `<b><color=\\"${nameColor}\\">${name}</></>`;

      // speaking player's position
      const myPos = (pos.find(p => p.player.name === name) || {pos: [0, 0, Infinity]}).pos;

      // send garbled message to every player
      for (const p of Omegga.players) {
        if (p.name !== name) {
          // this player's position
          const pPos = (pos.find(pl => pl.player.name === p.name) || {pos: [0, 0, Infinity]}).pos;
          // get dist between player and speaking player
          const dist = Math.hypot(myPos[0]-pPos[0], myPos[1]-pPos[1], myPos[1]-pPos[1]);
          // amount increases every 200 units
          const amt = Math.min(Math.max((dist - 200) / 200, 1), 20);
          // garble the message
          const garbled = garble(message, amt);
          //sanitize it
          const nameText = `<b><color=\\"${nameColor}\\">${garble(name, amt)}</></>`;
          const sanitized = `"${nameText}: ${sanitize(garbled, amt)}"`;
          // send it to the player
          Omegga.whisper(p, sanitized);
        }
      }
    });
  }

  async stop() {

  }
};