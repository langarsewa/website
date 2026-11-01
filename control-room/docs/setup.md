# Setting up the Control Room (one time)

Everything here is done once by Hardeep. Nothing in it is typed into a chat; tokens and keys go
straight into GitHub or Cloudflare.

## 1. Repository

`github.com/new` as `langarsewa`: name `control-room`, Private, no README. Then the first push
from the laptop creates `main`.

Repository secrets (Settings → Secrets and variables → Actions):

| Name                    | Value                                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | the account token `langarsewa-github-actions` (Cloudflare Pages: Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | `f79431adca1961ad274059c18f629c20`                                     |

CI then creates the Pages project `control` on its first run and deploys every green push.

## 2. GitHub App "Sewa Control Room"

GitHub → Settings → Developer settings → GitHub Apps → New GitHub App, owner `langarsewa`.

| Field                     | Value                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Name                      | Sewa Control Room                                                                                                                 |
| Homepage                  | https://control.langarsewa.org                                                                                                    |
| Webhook                   | inactive                                                                                                                          |
| Repository permissions    | Contents: Read and write · Pull requests: Read and write · Issues: Read and write · Actions: Read · Checks: Read · Metadata: Read |
| Where can it be installed | Only this account                                                                                                                 |

Create, note the **App ID**, generate a **private key** (a `.pem` download), then **Install App**
on `langarsewa/website` only and note the **Installation ID** from the URL
(`…/installations/<id>`). Convert the key once:

```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in sewa-control-room.*.private-key.pem -out app-key-pkcs8.pem
```

## 3. Cloudflare Access

Cloudflare dashboard → Zero Trust (free plan; pick a team name such as `langarsewa`; the team
domain becomes `langarsewa.cloudflareaccess.com`).

1. Settings → Authentication → add **Google** as a login method (or keep the built-in
   One-time PIN only; both work).
2. Access → Applications → Add → Self-hosted: name `Control Room`, domain
   `control.langarsewa.org`, session 24 hours.
3. Policy `Sewa team`, action Allow, include **Emails**: `info@langarsewa.org` plus each
   sewadar's address. Save.
4. On the application's Overview copy the **Application Audience (AUD) tag**.

## 4. Pages project secrets

Cloudflare → Workers & Pages → `control` → Settings → Variables and secrets (Production), or from
the laptop with `wrangler pages secret put <NAME> --project-name control`:

| Secret                       | Value                                                                      |
| ---------------------------- | -------------------------------------------------------------------------- |
| `GITHUB_APP_ID`              | from step 2                                                                |
| `GITHUB_APP_PRIVATE_KEY`     | contents of `app-key-pkcs8.pem`                                            |
| `GITHUB_APP_INSTALLATION_ID` | from step 2                                                                |
| `CLOUDFLARE_PAGES_TOKEN`     | a token with Cloudflare Pages: Edit (can be a second copy of the CI token) |
| `CLOUDFLARE_ACCOUNT_ID`      | `f79431adca1961ad274059c18f629c20`                                         |
| `ACCESS_TEAM_DOMAIN`         | `langarsewa.cloudflareaccess.com`                                          |
| `ACCESS_AUD`                 | from step 3                                                                |

## 5. Hostname

In the `langarsewa.org` zone: CNAME `control` → `control.pages.dev` (proxied), and in the Pages
project Custom domains add `control.langarsewa.org`. Access protects the hostname from then on.

## 6. People

`config/people.json` lists owners and editors by email. Changing it is a normal pull request.
Someone removed from the Access policy cannot reach the app at all; someone removed from
`people.json` can sign in but gets "this account is not on the list".
