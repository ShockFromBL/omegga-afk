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
| `auto-afk` | Automatically mark a player as AFK when the timeout is reached. | On |
| `auto-afk-timeout` | Number of minutes to wait until a player is marked as AFK. | 5 |
| `auto-afk-maxtimeout` | Additional number of minutes to wait before taking action on a player that has been marked as AFK. | 10 |
| `auto-afk-threshold` | Minimum number of players required before taking action on a player that has been marked as AFK. | 1 |
| `auto-afk-action` | Action to take when the max timeout is reached. | None |
| `auto-afk-exclusions` | Restrict action against players marked as AFK if they are part of the specified roles (comma-separated). | |
| `allow-manual-afk` | Permit players to manually go AFK using the `/afk` command. | On |
| `afk-announce` | Announce to joining players if there are people currently AFK. | On |