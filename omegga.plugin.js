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
      this.vars[player.id].count = 0;
    } else {
      reason = sanitize(reason);

      Omegga.broadcast(`<b><color="${color}">${player.name}</></> is now AFK${reason == '' ? '.' : ' (' + reason + ')'}`);

      this.vars[player.id].afk = true;
      this.vars[player.id].reason = reason;
    }
  }

  totalAFKCount() {
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

    let excludedRoles = this.afkExclusions.split(',');

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
        count: 0
      };
    }

    if (this.config['auto-afk']) {
      this.afkInterval = setInterval(async () => {
        const positions = await Omegga.getAllPlayerPositions();

        for (const o of positions) {
          const player = o.player;

          this.vars[player.id].count++;

          if (this.vars[player.id].afk) {
            if (player.isHost()) continue;

            if (this.hasExcludedRole(player)) continue;

            if (this.afkAction == 'kick' && this.vars[player.id].count >= this.afkMaxTimeout) {
              Omegga.writeln(`Chat.Command /kick "${player.name}" "AFK (Auto)"`);
            }

            continue;
          }

          let curPos = o.pos;

          if (this.vars[player.id].lastPos === undefined) this.vars[player.id].lastPos = curPos;

          if (curPos[0] != this.vars[player.id].lastPos[0] ||
              curPos[1] != this.vars[player.id].lastPos[1] ||
              curPos[2] != this.vars[player.id].lastPos[2]) {

            if (this.vars[player.id].count >= (this.afkTimeout - this.afkCountdown)) {
              Omegga.whisper(player, `AFK countdown aborted.`);
            }

            this.vars[player.id].lastPos = curPos;
            this.vars[player.id].count = 0;
          } else {
            if (this.vars[player.id].count >= this.afkTimeout) {
              this.afk(player, true);
              continue;
            }

            if (this.vars[player.id].count == (this.afkTimeout - this.afkCountdown)) {
              Omegga.whisper(player, `<color="ff9999">You will be automatically marked as AFK in <b>${this.afkCountdown}s</> unless you move or chat.</>`);
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
        this.vars[player.id].count = 0;
      }
    });

    Omegga.on('join', async (player) => {
      this.vars[player.id] = {
        afk: false,
        reason: '',
        count: 0
      };

      if (this.config['afk-announce']) {
        const total = this.totalAFKCount();

        if (total > 0) {
          Omegga.whisper(player, `There ${total == 1 ? 'is' : 'are'} currently <b>${total}</> player${total == 1 ? '' : 's'} AFK, to view who they are type <code>/afkers</>`);
        }
      }
    });

    Omegga.on('metrics:heartbeat', async () => {
      for (const p of Omegga.players) {
        if (this.vars[p.id].afk) {
          Omegga.whisper(p, `You are currently marked as AFK, type <code>/afk</> or chat to remove the status.`);
        }
      }
    });

    Omegga.on('cmd:afk', async (name, ...args) => {
      const player = Omegga.getPlayer(name);

      if (!this.config['allow-manual-afk']) {
        Omegga.whisper(player, `Manual AFK is currently disabled.`);
        return;
      }

      const reason = args.join(' ').trim();

      if (this.vars[player.id].afk && (reason == '' || reason == this.vars[player.id].reason)) {
        this.afk(player, false);
      } else {
        this.afk(player, true, reason);
      }
    });

    Omegga.on('cmd:afkers', async (name) => {
      const player = Omegga.getPlayer(name);

      if (this.totalAFKCount() == 0) {
        Omegga.whisper(player, `There are currently no players marked as AFK.`);
      } else {
        Omegga.whisper(player, `Players currently AFK:`);

        for (const p of Omegga.players) {
          if (this.vars[p.id].afk) {
            const color = p.getNameColor();
            const reason = this.vars[p.id].reason;

            Omegga.whisper(player, ` - <b><color="${color}">${p.name}</></>${reason == '' ? '' : ' (' + reason + ')'}`);
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