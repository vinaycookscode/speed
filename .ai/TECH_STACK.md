# Speed - Tech Stack Matrix

## Frontend Framework
- **React 18**: Core rendering engine.
- **TypeScript**: Strict typing across the board.
- **Vite**: Ultra-fast bundler and dev server.

## Desktop Shell
- **Electron**: Native desktop wrapper allowing deep OS file-system integration (IPC bridges).
- `vite-plugin-electron`: Seamless dev server reloading for main/preload electron processes.

## State & Data Management
- **Zustand**: Lightweight global state. Chosen for its simple `get()` and `set()` API which makes the `tick()` orchestration game-loop vastly easier to build and scale without triggering React re-render cascades.
- **uuid**: Universally used for persistent entity ID generation across sessions.

## Styling & User Interface
- **TailwindCSS v4**: Atomic utility-first CSS framework.
- **Framer Motion**: Complex mounting/unmounting and orchestration animations, extensively used in the `TaskBoard` and `IdeaInputView`.
- **Lucide React**: Universal lean iconography suite.
- **clsx / tailwind-merge**: Conditional and functional class composition.
- **React Router Dom**: Client-side navigational state using `HashRouter` (required for static Electron compilation).

## Build & Internal Tools
- **ESLint & TypeScript Compiler**: Strict code quality enforcement.
- **PostCSS**: Used for processing Tailwind classes.
- **Electron Builder**: Production packaging.
