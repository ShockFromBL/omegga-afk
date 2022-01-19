# omegga-afk

A plugin for [Omegga](https://github.com/brickadia-community/omegga) that marks players as AFK if they stop moving & chatting for a set period of time.

By default, players will automatically be given AFK status if they do not move for 5 minutes.

Players can manually go AFK using `/afk <optional reason>`\
They can also be automatically kicked if they go AFK for too long.

Both of the above can be switched on and off in the configuration.

AFK status will be automatically revoked once a player moves or chats.

## Installing

Do `omegga install gh:ShockFromBL/afk`

## Updating

Do `omegga update afk`

## Commands

| Command | Description | Example |
| ------------- | ------------- | ------------- |
| `/afk` | Manually go AFK with an optional reason. | `/afk eating dinner` |
| `/afkers` | Print out a list of current players who are marked as AFK. | `/afkers` |

## Configuration

| Setting | Description | Default |
| ------------- | ------------- | ------------- |
| `auto-afk` | Automatically mark a player as AFK when the Auto AFK Timeout is reached. | ON |
| `auto-afk-timeout` | Number of minutes to wait until a player is marked as AFK. | 5 |
| `auto-afk-maxtimeout` | Number of additional minutes to wait before taking action on a player that has been marked as AFK. | 10 |
| `auto-afk-action` | Action to take after the Auto AFK Max Timeout is reached. | None |
| `auto-afk-exclusions` | Roles to exclude from Auto AFK Action. | |
| `allow-manual-afk` | Allow players to manually go AFK using the `/afk` command. | ON |
| `afk-announce` | If there are players marked as AFK when others join, notify them. | ON |