# Releases on Hetzner

Publishing a non-prerelease GitHub Release runs `.github/workflows/release.yml`.
It checks out the release tag, installs dependencies and runs tests, uploads the
tracked source over SSH, builds a Node 22 Docker image on the server, and replaces
the bot. Building on the server supports either amd64 or arm64 Hetzner instances.
The workflow waits for a Discord-ready heartbeat before registering commands.
Draft releases and prereleases do not deploy. Include the workflow in the release tag.
See GitHub's [release event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#release)
and Discord's [command API documentation](https://docs.discord.com/developers/interactions/application-commands).

## One-time server setup

Use a Linux server with Bash, Docker Engine, Docker Compose v2 (supporting `up
--wait --wait-timeout`), tar, and flock. Allow SSH from your GitHub Actions runners.
Create a deployment user with Docker access and an SSH public key in its
`~/.ssh/authorized_keys`. Docker access gives this account administrative power.
Create `/opt/tucsonbot` and give that user ownership:

```sh
sudo install -d -o DEPLOY_USER -g DEPLOY_USER /opt/tucsonbot
```

Create `/opt/tucsonbot/.env` on the server (mode 600):

```dotenv
DISCORD_TOKEN=your-bot-token
APP_ID=your-application-id
COMMAND_SCOPE=guild
COMMAND_GUILD_ID=your-server-id
```

`TEST_GUILD_ID` is accepted as a fallback. Set `COMMAND_SCOPE=global` explicitly
for all servers; guild scope is the default. Changing scope does not remove
commands in the old scope. Remove those separately if migrating.

If migrating an existing bot, stop its old Compose deployment first to avoid
the `tucson-bot` container name conflict. Copy its existing **data directory** to
`/opt/tucsonbot/data` while the bot is stopped, preserving SQLite files and
permissions. Back it up before migration. Subsequent releases reuse that path
and the server `.env`; neither is bundled in the uploaded source archive.

## GitHub configuration

Create the `production` GitHub environment. Add these environment secrets:

| Secret | Value |
| --- | --- |
| `HETZNER_HOST` | Server IP address or hostname |
| `HETZNER_USER` | Deployment account name |
| `HETZNER_SSH_KEY` | Dedicated SSH private key, without a passphrase |
| `HETZNER_KNOWN_HOSTS` | Verified OpenSSH known_hosts entry for this server |

Optionally set environment variable `HETZNER_SSH_PORT` (default `22`). For a
nonstandard port the known_hosts entry must use `[host]:port`. Obtain the host
key through a trusted channel (such as Hetzner's console) and verify its
fingerprint; the workflow deliberately does not trust a fresh SSH key scan.
Discord credentials stay on the server and are not needed in GitHub secrets.

Commit and push the workflow and supporting files, create a version tag containing
them, then publish its GitHub Release. Monitor Actions → Deploy release to Hetzner.
Runs are serialized, and a server lock also prevents simultaneous deployments.
GitHub can replace pending runs when several releases are published together;
publish one release at a time and wait for completion.

## Command changes and failures

The first deployment registers the full command list. Subsequent deployments hash
the serialized definitions and target application/scope against the last successful
registration in `data/commands.sha256`. Changed definitions trigger a bulk refresh
that handles new, changed, renamed, and removed commands. Handler-only changes
deploy as new bot code without an unnecessary Discord registration request.
All commands for this application in the selected scope are managed by this repo.
An empty command directory is rejected to guard against accidental deletion.

Failed registrations exit nonzero and do not advance the hash, so rerunning the
failed Actions run retries them. For out-of-band Discord changes or a replaced
application, force registration from the running container:

```sh
docker exec tucson-bot node deploy-commands.js --force
```

Build failures leave the old container running. Startup/readiness failures and
command registration failures mark the workflow failed; after container replacement
there is **no automatic rollback**. Inspect `docker logs tucson-bot`, correct the
configuration, and rerun the release. A failed registration can leave the new bot
running with old command definitions until the retry succeeds.

For a manual rollback, select a retained release directory and its SHA on the server:

```sh
export TUCSON_IMAGE=tucson-bot:PREVIOUS_COMMIT_SHA
docker compose -p tucsonbot -f releases/PREVIOUS_RELEASE_DIRECTORY/docker-compose.production.yml up -d --wait --wait-timeout 120
docker exec tucson-bot node deploy-commands.js --force
```

Rollback does not revert SQLite data or any future schema migrations. Images and
source directories are retained for recovery; periodically remove old ones after
confirming they are no longer needed. `.deployed-release` records the last fully
successful workflow deployment, not a manual rollback.
