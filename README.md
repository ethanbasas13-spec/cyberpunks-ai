# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Environment variables

- **Purpose**: `GEMINI_API_KEY` is used by the backend (`server.mjs`). For a frontend fallback, use `VITE_GEMINI_API_KEY` (Vite requires `VITE_` prefix).
- **Do not commit** your real API keys to the repository. Use the provided `.env.example` as a template.

- Local (PowerShell temporary for this session):

```powershell
$env:GEMINI_API_KEY="AIZaSyB3IakqXE4chEqyQTQYrmAtx7zwGmWyMnU"
$env:VITE_GEMINI_API_KEY="AIZaSyB3IakqXE4chEqyQTQYrmAtx7zwGmWyMnU"
```

- Local (PowerShell persistent for current user):

```powershell
[System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY','AIZaSyB3IakqXE4chEqyQTQYrmAtx7zwGmWyMnU','User')
[System.Environment]::SetEnvironmentVariable('VITE_GEMINI_API_KEY','AIZaSyB3IakqXE4chEqyQTQYrmAtx7zwGmWyMnU','User')
```

- Netlify: Add `GEMINI_API_KEY` (and `VITE_GEMINI_API_KEY` if you need frontend access) in the Site settings → Build & deploy → Environment → Environment variables, or use the Netlify CLI:

```bash
netlify env:set GEMINI_API_KEY "AIZaSyB3IakqXE4chEqyQTQYrmAtx7zwGmWyMnU"
netlify env:set VITE_GEMINI_API_KEY "AIZaSyB3IakqXE4chEqyQTQYrmAtx7zwGmWyMnU"
```

Once set, restart the dev server or trigger a new deploy so the variables take effect.

- Optional explicit-content backend: If you want NSFW/explicit requests routed to a different model or service you control, set these env vars on your backend/Netlify site:

```powershell
[System.Environment]::SetEnvironmentVariable('EXPLICIT_API_URL','https://your-explicit-endpoint.example.com/api/generate','User')
[System.Environment]::SetEnvironmentVariable('EXPLICIT_API_KEY','your_explicit_api_key_here','User')
```

On Netlify use:

```bash
netlify env:set EXPLICIT_API_URL "https://your-explicit-endpoint.example.com/api/generate"
netlify env:set EXPLICIT_API_KEY "your_explicit_api_key_here"
```

When `EXPLICIT_API_URL` is set, the backend will POST a small JSON payload to that endpoint for requests where the user enabled NSFW. The backend expects a JSON response containing a string field such as `reply` or `text`. If the explicit backend fails, the server falls back to the Gemini API.
