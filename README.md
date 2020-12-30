# omegga-afk

A plugin for [Omegga](https://github.com/brickadia-community/omegga) that marks players as AFK if they stop moving & chatting for a set period of time (default 5 minutes).

Players can also manually go AFK using `/afk <optional reason>`\
This feature can be switched off along with movement detection.

Only the use of `/afk` or chatting will remove AFK status once it has been set.\
This is because other players can interfere with the movement detection.

Players who are AFK will be constantly reminded of so in chat.

## Installation

Do `git clone https://github.com/orthew/omegga-afk afk` in Omegga's `plugins` directory.

## Commands

| Command | Description | Example |
| ------------- | ------------- | ------------- |
| `/afk` | Manually go AFK with an optional reason. | `/afk eating dinner` |
| `/afkers` | Print out a list of current players who are marked as AFK. | `/afkers` |

## Configuration

| Setting | Description | Default |
| ------------- | ------------- | ------------- |
| `auto-afk` | Automatically mark a player when the Auto AFK Timeout is reached. | ON |
| `auto-afk-timeout` | Number of minutes to wait until a player is marked as AFK. | 5 |
| `allow-manual-afk` | Allow players to manually go AFK using the `/afk` command. | ON |
| `afk-announce` | If there are players marked as AFK when others join, notify them. | ON |