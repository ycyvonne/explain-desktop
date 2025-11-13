# GhostKey

A macOS-only Electron overlay that mirrors Claude Desktop's "Explain Screenshot" flow. Hit a global hotkey, capture a region with the native macOS selection UI, and chat about it in-place without losing context.

## Global shortcuts
- ⌘⇧E => Explain
- ⌘⇧X => Ask a question
- ⌘⇧C => Send highlighted text to auto-explain

## Features
- Native `screencapture -i` tool
- Floating, always-on-top overlay pinned near the cursor
- Screenshot preview stays visible for follow-up questions
- Chat history maintained locally in the renderer
- Pluggable LLM adapter (defaults to OpenAI-compatible REST call)

## Getting Started
1. Install dependencies
   ```
   npm install
   ```
2. Provide an API key for a vision-capable model. The default adapter reads `VITE_OPENAI_API_KEY` from your environment. For example:
   ```
   export VITE_OPENAI_API_KEY="sk-..."
   ```
3. Build and launch the desktop app
   ```
   npm start
   ```

When the app is running, press ⌘⇧E to trigger the capture flow. Select a screen region, then type follow-up questions directly inside the overlay. Press Esc or click ✕ to hide the bubble.

## Project Structure
```
/app
  main.ts          # Electron main process
  preload.ts       # IPC bridge exposing overlay APIs
  renderer/
    index.html     # Vite entry
    main.tsx       # React bootstrap
    ChatBubble.tsx # Overlay UI and chat state
    llm.ts         # Vision model adapter
    style.css      # Overlay styling
```

## Customising the LLM
`app/renderer/llm.ts` wraps a minimal OpenAI-style `chat/completions` call. Swap the fetch implementation (or point to your own API) so long as the function resolves to a string answer.

## Notes & Limitations
- The first capture will prompt for macOS *Screen Recording* permission. If a capture returns `null`, direct the user to **System Settings → Privacy & Security → Screen Recording**.
- Protected windows (DRM content) may capture as black screens—surface the error text in the chat bubble.
- Development mode currently rebuilds on each `npm start`. Add your preferred watcher/run-loop (e.g. `vite dev` + `tsc --watch`) if you need faster iteration.
