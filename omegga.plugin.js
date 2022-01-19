const { chat: { sanitize } } = OMEGGA_UTIL;

class AFK {
  constructor(omegga, config) {
    this.omegga = omegga;
    this.config = config;

    this.vars = {};
    this.afkTimeout = Math.max(config['auto-afk-timeout'], 1) * 60;
    this.afkMaxTimeout = this.afkTimeout + Math.max(config['auto-afk-maxtimeout'], 0) * 60;
    this.afkAction = config['auto-afk-action'];
    this.afkExclusions = config['auto-afk-exclusions'];
    this.afkCountdown = 10;
  }

  afk(player, afk, reason = '') {
    const color = player.getNameColor();

    if (!afk) {
      Omegga.broadcast(`<b><color="${color}">${player.name}</></> is no longer AFK.`);

      this.vars[player.id].afk = false;
      this.vars[player.id].reason = '';
      this.vars[player.id].asleep = 0;
    } else {
      reason = sanitize(reason);

      Omegga.broadcast(`<b><color="${color}">${player.name}</></> is now AFK${reason == '' ? '.' : ' (' + reason + ')'}`);

      this.vars[player.id].afk = true;
      this.vars[player.id].reason = reason;
    }
  }

  // modified from https://github.com/voximity/omegga-behind-you/blob/720277eb6e07784541bc1b7800fdd15c7f5a2f29/omegga.plugin.js#L17
  async getPlayerTransform(player) {
    const match = await this.omegga.watchLogChunk(
      `Chat.Command /GetTransform ${player.name}`,
      /Transform: X=(-?[0-9,.]+) Y=(-?[0-9,.]+) Z=(-?[0-9,.]+) Roll=(-?[0-9,.]+) Pitch=(-?[0-9,.]+) Yaw=(-?[0-9,.]+)/,
      {first: (match) => match[0].startsWith('Transform:'), timeoutDelay: 1000}
    );

    let result;

    try {
      result = {x: match[0][1], y: match[0][2], z: match[0][3], roll: match[0][4], pitch: match[0][5], yaw: match[0][6]};
    } catch (e) {
      if (e instanceof TypeError) {
        return null; // player is dead.
      } else {
        throw e;
      }
    }

    return Object.fromEntries(Object.entries(result).map(([k, n]) => [k, parseFloat(n.replace(',', ''))]));
  }

  getTotalAFK() {
    let total = 0;

    for (const p of Omegga.players) {
      if (this.vars[p.id].afk) {
        total++;
      }
    }

    return total;
  }

  hasExcludedRole(player) {
    if (this.afkExclusions == null) return false;

    const excludedRoles = this.afkExclusions.split(',');

    for (const r of player.getRoles()) {
      for (const x of excludedRoles) {
        if (r == x.trim()) {
          return true;
        }
      }
    }

    return false;
  }

  async init() {
    for (const p of Omegga.players) {
      this.vars[p.id] = {
        afk: false,
        reason: '',
        asleep: 0,
        yaw: 0,
        confidence: 0
      };
    }

    if (this.config['auto-afk']) {
      this.afkInterval = setInterval(async () => {
        for (const p of Omegga.players) {
          this.vars[p.id].asleep++;

          let curYaw = 0;
          const transform = await this.getPlayerTransform(p);

          if (transform != null) curYaw = transform.yaw;

          if (this.vars[p.id].yaw != curYaw) {
            if (this.vars[p.id].confidence < 2) {
              if (this.vars[p.id].asleep >= (this.afkTimeout - this.afkCountdown) &&
                  this.vars[p.id].asleep <= (this.afkTimeout)) {
                Omegga.whisper(p, `AFK Countdown aborted.`);
              }

              this.vars[p.id].asleep = 0;
            }

            this.vars[p.id].yaw = curYaw;

            if (this.vars[p.id].confidence > 0) this.vars[p.id].confidence--;
          } else {
            if (this.vars[p.id].confidence < 2) this.vars[p.id].confidence++;
          }

          if (this.vars[p.id].afk) {
            if (this.vars[p.id].confidence == 0) {
              this.afk(p, false);
              continue;
            }

            if (this.afkAction == 'kick' && this.vars[p.id].asleep >= this.afkMaxTimeout) {
              if (!p.isHost() && !this.hasExcludedRole(p) && this.vars[p.id].confidence == 2) {
                Omegga.writeln(`Chat.Command /kick "${p.name}" "AFK (Auto)"`);
              }
            }
          } else {
            if (this.vars[p.id].asleep >= this.afkTimeout) {
              this.afk(p, true);
              continue;
            }

            if (this.vars[p.id].asleep == (this.afkTimeout - this.afkCountdown)) {
              Omegga.whisper(p, `<color="ff9999">You will be automatically marked as AFK in <b>${this.afkCountdown}</> seconds unless you move or chat.</>`);
            }
          }
        }
      }, 1000);
    }

    Omegga.on('chat', async (name) => {
      const player = Omegga.getPlayer(name);

      if (this.vars[player.id].afk) {
        this.afk(player, false);
      } else {
        if (this.vars[player.id].asleep >= (this.afkTimeout - this.afkCountdown) &&
            this.vars[player.id].asleep <= (this.afkTimeout)) {
          Omegga.whisper(player, `AFK Countdown aborted.`);
        }

        this.vars[player.id].asleep = 0;
      }
    });

    Omegga.on('join', async (player) => {
      this.vars[player.id] = {
        afk: false,
        reason: '',
        asleep: 0,
        yaw: 0,
        confidence: 0
      };

      if (this.config['afk-announce']) {
        const total = this.getTotalAFK();

        if (total > 0) {
          Omegga.whisper(player, `There ${total == 1 ? 'is' : 'are'} currently <b>${total}</> player${total == 1 ? '' : 's'} AFK, to view who they are type <code>/afkers</>`);
        }
      }
    });

    Omegga.on('cmd:afk', async (name, ...args) => {
      const player = Omegga.getPlayer(name);
      const reason = args.join(' ').trim();

      if (this.vars[player.id].afk && (reason == '' || reason == this.vars[player.id].reason)) {
        this.afk(player, false);
      } else {
        if (!this.config['allow-manual-afk']) {
          Omegga.whisper(player, `Manual AFK is currently disabled.`);
          return;
        }

        this.afk(player, true, reason);
      }
    });

    Omegga.on('cmd:afkers', async (name) => {
      const player = Omegga.getPlayer(name);

      if (this.getTotalAFK() == 0) {
        Omegga.whisper(player, `There are currently no players marked as AFK.`);
      } else {
        Omegga.whisper(player, `Players currently AFK:`);

        for (const p of Omegga.players) {
          if (this.vars[p.id].afk) {
            const color = p.getNameColor();
            const reason = this.vars[p.id].reason;
            let time;
            let denom;

            if (this.vars[p.id].asleep < 60) {
              time = this.vars[p.id].asleep;
              denom = (time == 1 ? 'second' : 'seconds');
            } else {
              time = Math.floor(this.vars[p.id].asleep / 60);
              denom = (time == 1 ? 'minute' : 'minutes');
            }

            Omegga.whisper(player, ` - <b><color="${color}">${p.name}</></> has been away for <b>${time}</> ${denom}</>${reason == '' ? '.' : ' (' + reason + ').'}`);
          }
        }
      }
    });

    return { registeredCommands: ['afk', 'afkers'] };
  }

  async stop() {
    clearInterval(this.afkInterval);
  }
};

module.exports = AFK;