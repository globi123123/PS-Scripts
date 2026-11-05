# PS-Scripts

A personal library of PowerShell scripts for everyday Windows administration,
published as a static website on GitHub Pages.

- **Categories:** Windows Updates, Drivers, VPN, System
- **Every script is labelled** as **Read-Only** (only reads information) or
  **System-Changes** (changes files, settings or services)
- **Implemented** scripts are ready to use, **placeholders** are planned and
  only contain a scaffold
- Client-side search and filters, syntax-highlighted source, copy and
  download buttons, dark and light theme

The `.ps1` files in [`scripts/`](scripts) are the real scripts. They can be
used directly from the repository, the website only displays them.

## Tech stack

- React 19 + TypeScript, built with Vite
- Plain CSS with CSS Modules and design tokens (no UI framework)
- Self-hosted fonts: Inter and JetBrains Mono
- No backend, no database, no external APIs. Routing and PowerShell syntax
  highlighting are small modules in this repository.

## Project structure

```text
PS-Scripts/
├── scripts/                     The PowerShell scripts (source of truth)
│   ├── windows-updates/
│   ├── drivers/
│   ├── vpn/
│   └── system/
├── public/                      Copied to the build as-is
│   ├── 404.html                 Redirects clean URLs to hash routes on GitHub Pages
│   ├── favicon.svg
│   └── .nojekyll
├── src/
│   ├── config.ts                Site name, repository URL, branch
│   ├── data/
│   │   ├── types.ts             Types for scripts and categories
│   │   ├── categories.ts        The four categories
│   │   ├── scripts.ts           Metadata of every script  <- edit when adding a script
│   │   └── library.ts           Joins metadata with the .ps1 files, helpers
│   ├── router/                  Minimal hash router (routes, Link, query params)
│   ├── lib/
│   │   ├── powershell.ts        PowerShell tokenizer for syntax highlighting
│   │   ├── search.ts            Client-side search and filters
│   │   ├── theme.ts             Dark/light theme with localStorage
│   │   ├── clipboard.ts         Copy to clipboard
│   │   └── download.ts          .ps1 download (UTF-8 BOM, CRLF)
│   ├── components/              Reusable UI components (+ .module.css)
│   ├── pages/                   Overview, Scripts, Category, Script, Guide, 404
│   ├── styles/                  tokens.css (both themes) and base.css
│   ├── App.tsx                  Route -> page
│   └── main.tsx                 Entry point
├── .github/workflows/deploy.yml Build and deploy to GitHub Pages
├── index.html                   Includes the theme script that prevents flashing
└── vite.config.ts
```

## Run locally

Requires Node.js 20.19 or newer (22 LTS recommended).

```bash
npm install
npm run dev
```

Open the URL that Vite prints (usually http://localhost:5173).

Other commands:

```bash
npm run build      # type check + production build into dist/
npm run preview    # serve the production build locally
npm run typecheck  # TypeScript only
```

## Add a script

1. Save the script as `scripts/<category>/<Name>.ps1`, for example
   `scripts/system/Get-DiskSpace.ps1`. Use comment-based help like the other
   scripts. Keep the file ASCII or save it as UTF-8 with BOM, so Windows
   PowerShell 5.1 reads special characters correctly.
2. Add an entry to `src/data/scripts.ts`. `name` must match the file name:

   ```ts
   {
     name: 'Get-DiskSpace',
     category: 'system',
     classification: 'read-only',      // or 'system-changes' (then `changes` is required)
     status: 'implemented',            // or 'placeholder'
     summary: 'One sentence for cards and lists.',
     description: ['Longer explanation, one string per paragraph.'],
     keywords: ['disk', 'free space'],
     powershell: ['5.1', '7.x'],
     requirements: { os: 'Windows 10, Windows 11', admin: false, permissions: ['Runs as a standard user'] },
     parameters: [{ name: 'DriveLetter', type: 'string', description: 'Drive to check.' }],
     examples: [{ title: 'Check all drives', code: '.\\Get-DiskSpace.ps1' }],
     added: '2026-11-10',
   },
   ```

3. Run `npm run dev` and check the new page. The source code, line count,
   search index and counts update automatically.

TypeScript makes sure that every System-Changes script lists what it
changes. If a metadata entry has no matching `.ps1` file, the browser console
shows an error and the script page says that the source file is missing.

To add a category, extend `CategoryId` in `src/data/types.ts`, add it to
`src/data/categories.ts` and give it an icon in `src/components/Badges.tsx`.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the site and deploys it
on every push to `main`.

1. Push the project to the `main` branch of the repository.
2. In the repository open **Settings → Pages** and set
   **Build and deployment → Source** to **GitHub Actions**.
3. Push to `main` again or start the workflow manually under
   **Actions → Deploy to GitHub Pages → Run workflow**.
4. The site is then available at `https://<user>.github.io/PS-Scripts/`.

### Why it works on GitHub Pages

- `vite.config.ts` uses `base: './'`, so all asset paths are relative. The
  build works under `/PS-Scripts/`, under a renamed repository and on a custom
  domain without changes.
- The app uses hash routes (`#/scripts/get-pendingreboot`). GitHub Pages only
  ever serves `index.html`, so links, bookmarks and page reloads always work.
- `public/404.html` catches "clean" URLs such as `/PS-Scripts/scripts/...`
  and redirects them to the matching hash route.

## Configuration

Edit `src/config.ts`:

| Setting         | Purpose                                                   |
| --------------- | --------------------------------------------------------- |
| `name`          | Name in the header and browser tab                        |
| `tagline`       | Subtitle used in titles                                   |
| `repositoryUrl` | GitHub link in the header and sidebar                     |
| `defaultBranch` | Branch used for the "View on GitHub" link of every script |
