# LocalTube

LocalTube is a modern, high-performance desktop application for browsing YouTube playlists, channels, and videos with a focus on a clean, premium user experience. Built with Electron and React, it provides a distraction-free way to consume content from your favorite creators.

## ✨ Features

- **🚀 Desktop-First Experience**: A native-feeling application with smooth interactions and a polished UI.
- **📺 Distraction-Free Browsing**: Browse YouTube channels and playlists without the clutter and algorithm-driven noise of the web interface.
- **📑 Channel & Playlist Management**: Easily navigate through curated content and deep-dive into specific channels.
- **🔖 Bookmarking**: Save your favorite videos or playlists for quick access later.
- **🎨 Premium UI/UX**: Built with a modern design system, featuring glassmorphism, smooth animations, and a responsive layout.

## 🛠 Tech Stack

### Core
- **Framework**: [React 18](https://react.dev/)
- **Desktop Shell**: [Electron](https://www.electronjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

### State & Routing
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **State Management**: [Immer](https://immerjs.github.io/immer/)

### Styling & UI
- **CSS**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/) primitives
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [tailwindcss-animate](https://github.com/jamiebuilds/tailwindcss-animate)

### Desktop Utilities
- **Storage**: `electron-store`
- **Window Management**: `electron-window-state`
- **Updater**: `electron-updater`
- **Packaging**: `electron-builder`

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [pnpm](https://pnpm.io/) or `npm`

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/LocalTube.git
   cd LocalTube
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. (Optional) Set up environment variables:
   Copy `.env.example` to `.env` and fill in any required keys.

### Development

Run the development environment:

```sh
npm run dev
```

This command will concurrently start:
- The **Vite** dev server for the frontend (`src-web`).
- The **Electron** main process with TypeScript compilation and hot-reloading.

### Building for Production

To package the application for production:

```sh
npm run build
```

The build artifacts will be available in the `dist/` and `electron/dist/` directories (specific output location depends on `electron-builder.yml` configuration). By default, it targets macOS (arm64/x64).

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
