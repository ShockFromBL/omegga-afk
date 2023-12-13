const { chat: { sanitize } } = OMEGGA_UTIL;

class AFK {
  constructor(omegga, config) {
    this.omegga = omegga;
    this.config = config;

    this.vars = {};
    this.afkTimeout = Math.max(config['auto-afk-timeout'], 1) * 60;
    this.afkMaxTimeout = this.afkTimeout + Math.max(config['auto-afk-maxtimeout'], 0) * 60;
    this.afkThreshold = Math.max(config['auto-afk-threshold'], 1);
    this.afkAction = config['auto-afk-action'];
    this.afkExclusions = config['auto-afk-exclusions'];
    this.afkCountdown = 10;
    this.afkSensitivity = 2;

    this.iterator = 0;
  }

  setAFK(player, afk, reason = '') {
    const color = player.getNameColor();

    if (!afk) {
      Omegga.broadcast(`<b><color="${color}">${player.name}</></> is no longer AFK.`);
      console.log(`${player.name} is no longer AFK.`);

      let time;
      let denom;

      if (this.getAsleepSeconds(player) < 60) {
        time = this.getAsleepSeconds(player);
        denom = (time == 1 ? 'second' : 'seconds');
      } else {
        time = Math.floor(this.getAsleepSeconds(player) / 60);
        denom = (time == 1 ? 'minute' : 'minutes');
      }

      Omegga.whisper(player, `You were away for <b>${time}</> ${denom}.`);

      this.vars[player.id].afk = false;
      this.vars[player.id].reason = '';
      this.vars[player.id].active = new Date().getTime();
    } else {
      reason = sanitize(reason);

      Omegga.broadcast(`<b><color="${color}">${player.name}</></> is now AFK${reason == '' ? '.' : ' (' + reason + ')'}`);
      console.log(`${player.name} is now AFK${reason == '' ? '.' : ' (' + reason + ')'}`);

      this.vars[player.id].afk = true;
      this.vars[player.id].reason = reason;
    }
  }

  // modified from https://github.com/voximity/omegga-behind-you/blob/720277eb6e07784541bc1b7800fdd15c7f5a2f29/omegga.plugin.js#L17
  async getPlayerTransform(player) {
    let result;

    try {
      const regex = /Transform: X=(-?[0-9,.]+) Y=(-?[0-9,.]+) Z=(-?[0-9,.]+) Roll=(-?[0-9,.]+) Pitch=(-?[0-9,.]+) Yaw=(-?[0-9,.]+)/;
      const match = await this.omegga.watchLogChunk(
        `Chat.Command /GetTransform "${player.name}"`,
        regex,
        { first: (match) => match[0].startsWith('Transform:'), timeoutDelay: this.afkClock }
      );

      result = { x: match[0][1], y: match[0][2], z: match[0][3], roll: match[0][4], pitch: match[0][5], yaw: match[0][6] };
    } catch (e) {
      if (e instanceof TypeError) {
        return null; // player is dead.
      } else {
        throw e;
      }
    }

    return Object.fromEntries(Object.entries(result).map(([k, n]) => [k, parseFloat(n.replace(',', ''))]));
  }

  getAsleepSeconds(player) {
    const timestamp = new Date().getTime();
    const asleep = timestamp - this.vars[player.id].active;
    const seconds = Math.floor(asleep / 1000);

    return seconds;
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

  restartInterval() {
    if (this.afkInterval != undefined) clearInterval(this.afkInterval);

    if (this.config['auto-afk']) {
      this.afkClock = Math.min(Math.max(1000 / Math.max(Omegga.players.length, 1), 28), 1000);
      this.afkInterval = setInterval(() => { this.clock() }, this.afkClock);
    }
  }

  async clock() {
    this.iterator++;

    if (this.iterator >= Omegga.players.length) this.iterator = 0;

    const p = Omegga.players[this.iterator];

    if (p == undefined) return;

    let curYaw;
    const transform = await this.getPlayerTransform(p);

    if (transform != null) {
      curYaw = transform.yaw;
    } else {
      curYaw = this.vars[p.id].yaw;
    }

    if (this.vars[p.id].yaw != curYaw) {
      if (this.vars[p.id].confidence < this.afkSensitivity && !this.vars[p.id].afk) {
        if (this.getAsleepSeconds(p) >= (this.afkTimeout - this.afkCountdown) &&
            this.getAsleepSeconds(p) <= (this.afkTimeout)) {
          Omegga.whisper(p, `AFK countdown aborted.`);
        }

        this.vars[p.id].active = new Date().getTime();
      }

      this.vars[p.id].yaw = curYaw;

      if (this.vars[p.id].confidence > 0) this.vars[p.id].confidence--;
    } else {
      if (this.vars[p.id].confidence < this.afkSensitivity) this.vars[p.id].confidence++;
    }

    if (this.vars[p.id].afk) {
      if (this.vars[p.id].confidence == 0) {
        this.setAFK(p, false);
        return;
      }

      if (this.afkAction == 'kick' && this.getAsleepSeconds(p) >= this.afkMaxTimeout) {
        if (!p.isHost() && !this.hasExcludedRole(p) && this.vars[p.id].confidence == this.afkSensitivity && Omegga.players.length >= this.afkThreshold) {
          console.log(`Kicking ${p.name} for being AFK too long.`);
          Omegga.writeln(`Chat.Command /kick "${p.name}" "AFK (Auto)"`);
        }
      }
    } else {
      if (this.getAsleepSeconds(p) >= this.afkTimeout && this.vars[p.id].confidence == this.afkSensitivity) {
        this.setAFK(p, true);
        return;
      }

      if (this.getAsleepSeconds(p) == (this.afkTimeout - this.afkCountdown)) {
        Omegga.whisper(p, `<color="ff9999">You will be automatically marked as AFK in <b>${this.afkCountdown}</> seconds unless you move or chat.</>`);
      }
    }

    if ((this.iterator + 1) >= Omegga.players.length) this.restartInterval();
  }

  async init() {
    for (const p of Omegga.players) {
      this.vars[p.id] = {
        afk: false,
        reason: '',
        active: new Date().getTime(),
        yaw: 0,
        confidence: 0
      };
    }

    this.restartInterval();

    Omegga.on('chat', async (name) => {
      const player = Omegga.getPlayer(name);

      if (this.vars[player.id].afk) {
        this.setAFK(player, false);
      } else {
        if (this.getAsleepSeconds(player) >= (this.afkTimeout - this.afkCountdown) &&
            this.getAsleepSeconds(player) <= (this.afkTimeout)) {
          Omegga.whisper(player, `AFK countdown aborted.`);
        }

        this.vars[player.id].active = new Date().getTime();
      }
    });

    Omegga.on('join', async (player) => {
      this.vars[player.id] = {
        afk: false,
        reason: '',
        active: new Date().getTime(),
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
        this.setAFK(player, false);
      } else {
        if (!this.config['allow-manual-afk']) {
          Omegga.whisper(player, `Manual AFK is currently disabled.`);
          return;
        }

        this.setAFK(player, true, reason);
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

            if (this.getAsleepSeconds(p) < 60) {
              time = this.getAsleepSeconds(p);
              denom = (time == 1 ? 'second' : 'seconds');
            } else {
              time = Math.floor(this.getAsleepSeconds(p) / 60);
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
