# Changelog

All notable changes to this project are documented here.
This file is generated automatically from [Conventional Commits](https://www.conventionalcommits.org/) — run `npm run changelog` to regenerate.

## [v1.1.0](https://github.com/limboy/localtube/compare/v1.0.5...v1.1.0) - 2026-04-21

### Features

- add unread count badges to sidebar playlist and channel items ([3fd0d01](https://github.com/limboy/localtube/commit/3fd0d018a178409974b3eca090ca737ab2985df3))
- add URL validation utility and integrate into sidebar input and bookmark display ([523bbe7](https://github.com/limboy/localtube/commit/523bbe74043258693eb9084809d302f4c0f14635))
- add support for bookmarking individual YouTube videos ([b9923be](https://github.com/limboy/localtube/commit/b9923be0ad2c113fad585d403972ac4b15f48b35))
- enable window dragging for navigation and sidebar regions via Tauri drag-region attribute ([e6e2379](https://github.com/limboy/localtube/commit/e6e23797d6dda9df4aa26ec8c048efa4c652f408))
- persist sidebar width to localStorage and improve loading/empty state handling in video player ([bc9b544](https://github.com/limboy/localtube/commit/bc9b544edfc084f128c7dbe898af5b3a0bb5579b))

### Bug Fixes

- increase sidebar z-index, remove redundant title, and disable drag region on resize handle ([80a2e48](https://github.com/limboy/localtube/commit/80a2e48a580a0574908d790cc83c4b671dbb2127))

### Refactoring

- remove tooltip from playlist add button in app sidebar ([15aeda0](https://github.com/limboy/localtube/commit/15aeda0d8016b7fdf4d354f96fd1f651e7fd6cf2))
- remove Tauri drag region attributes from sidebar and navigation components ([22d3fa9](https://github.com/limboy/localtube/commit/22d3fa99066cb08bfe475054c35098a5bf9c919a))

### Documentation

- update CHANGELOG for v1.0.5 ([392d662](https://github.com/limboy/localtube/commit/392d6625017397c1df3a58794bda1357adba67d3))

### Styles

- update unread count badge styling for better visual consistency ([8e0041f](https://github.com/limboy/localtube/commit/8e0041fa3fad1fcffa0cf9a63bb1ec0c6aa2dc52))
- reduce padding for .btn-icon utility class ([4a71b49](https://github.com/limboy/localtube/commit/4a71b49a8b7a1c9a5be472187b1514b5209c3670))
- remove padding and border from SidebarFooter in app-sidebar ([2cb7eb6](https://github.com/limboy/localtube/commit/2cb7eb680cd5c9f3a13f98cad796ec5072322c69))

## [v1.0.5](https://github.com/limboy/localtube/compare/v1.0.4...v1.0.5) - 2026-04-21

### Bug Fixes

- cache channel avatars as base64 to avoid 429 rate limiting ([23c6798](https://github.com/limboy/localtube/commit/23c67987933077c2ce400f204a5c5e4e8b3b13e4))

### Refactoring

- improve video player layout scroll behavior by updating container overflow and structure ([159f173](https://github.com/limboy/localtube/commit/159f1731815b2c09c3c1f46f8364088b455887aa))

### Documentation

- update CHANGELOG for v1.0.4 ([279f3ba](https://github.com/limboy/localtube/commit/279f3bafddb137ff32d43ba114afb8f7894886ee))

### Styles

- add custom thin scrollbar styling to global CSS ([d9d7630](https://github.com/limboy/localtube/commit/d9d7630beeb3529e858a3d77ddab0c6662e8aee9))

### Build

- restrict macOS build target to arm64 and update documentation requirements ([e383dab](https://github.com/limboy/localtube/commit/e383dabafb8566ec321fe9699432d3dab1151beb))

### Chores

- remove VS Code extensions config and update copyright holder name ([db4e392](https://github.com/limboy/localtube/commit/db4e39268575a1584e427660c2e7365412a3e184))

## [v1.0.4](https://github.com/limboy/localtube/compare/v1.0.3...v1.0.4) - 2026-04-21

### Features

- set application name to LocalTube in main process ([c42838c](https://github.com/limboy/localtube/commit/c42838cca1ada55b104101c34ca3bc2f38a96fc1))
- add screenshot to README, ignore RELEASENOTES.md, and improve video player sidebar layout responsiveness ([ca28816](https://github.com/limboy/localtube/commit/ca28816d48016e06575e15e5ab4b3690d098e014))

### Documentation

- update CHANGELOG for v1.0.3 ([774d612](https://github.com/limboy/localtube/commit/774d612fc64c5daf39059a8818d85cd72d5cd113))

### Chores

- add MIT license and update README prerequisites and directory name ([09954b6](https://github.com/limboy/localtube/commit/09954b6d35105326534d2d0299aab9b52efd0484))
- remove obsolete RELEASENOTES.md file ([fe968f6](https://github.com/limboy/localtube/commit/fe968f68bece3ac1927beed1798e6ed7d0427a77))

## [v1.0.3](https://github.com/limboy/localtube/compare/v1.0.2...v1.0.3) - 2026-04-20

### Features

- move UpdateIndicator from global Nav to individual route headers and update its styling ([5452dc8](https://github.com/limboy/localtube/commit/5452dc801540164daa2e462e140cad1af0fab2c9))

### Documentation

- update CHANGELOG for v1.0.2 ([51fd907](https://github.com/limboy/localtube/commit/51fd9075d240b17c4ea5154d4d97128d74199483))

## [v1.0.2](https://github.com/limboy/localtube/compare/v1.0.1...v1.0.2) - 2026-04-20

### Bug Fixes

- serve production build from localhost HTTP server to fix YouTube Error 152-4 ([8128301](https://github.com/limboy/localtube/commit/81283019378dd359b6b2ceeeb64b4c1f8e19041d))

### Documentation

- update CHANGELOG for v1.0.1 ([720348c](https://github.com/limboy/localtube/commit/720348cd303d7d359bc642f0928e295ebc3f7a7a))

## [v1.0.1](https://github.com/limboy/localtube/compare/v1.0.0...v1.0.1) - 2026-04-20

### Bug Fixes

- configure YouTube player host and inject Referer header to resolve playback errors ([70b94f6](https://github.com/limboy/localtube/commit/70b94f653406379d9d33fb244684aeded09168e0))

### Documentation

- update CHANGELOG for v1.0.0 ([8330336](https://github.com/limboy/localtube/commit/83303365f93bc677856c1844f9615147bbdde8cf))

## [v1.0.0](https://github.com/limboy/localtube/compare/v0.7.2...v1.0.0) - 2026-04-20

### Features

- maintain visual order in sidebar when shuffled and increase channel video limit ([ffd5f74](https://github.com/limboy/localtube/commit/ffd5f7435c95eb6e15a42beecc0ac8681746bc94))
- implement custom left sidebar provider and add toggle trigger to navigation bar ([bccddd8](https://github.com/limboy/localtube/commit/bccddd8b28fa25c4b07af1fc950ab6396da40ea3))
- disable autoPlay by default when navigating to playlists and channels ([6be6931](https://github.com/limboy/localtube/commit/6be69318f33843d040c5c3450554a67e06239f75))
- add configurable sidebar dimensions, storage keys, and right-side support to Sidebar component and integrate into VideoListPlayer ([4463111](https://github.com/limboy/localtube/commit/446311140c09f5913be704ffd5c30c1f0a66616a))
- disable auto-refresh on startup and ensure store updates trigger UI refreshes ([359c9a8](https://github.com/limboy/localtube/commit/359c9a8c00dd24f299ac2de2d2af1ae17626434d))
- implement cross-component state synchronization using custom store-updated events and unified refresh progress tracking ([1cdfc9a](https://github.com/limboy/localtube/commit/1cdfc9a7a587b2dbb6461a0e590f52e3512329a0))
- make video title clickable to open in external browser ([14199ae](https://github.com/limboy/localtube/commit/14199aeb6ede633fef83eb2b1bd685312276b896))
- implement auto-play control for playlists and channels with an optional description toggle in the video player ([341aeb5](https://github.com/limboy/localtube/commit/341aeb577b18f93023cd7c61f63ea2bce9844df1))
- implement grid-based channel and playlist browsing with thumbnail support ([6114886](https://github.com/limboy/localtube/commit/611488637ca78e6467a58bfe7ff9372255f4a861))
- add resizable sidebar functionality with persistent width storage and update SidebarRail to support dragging ([8567084](https://github.com/limboy/localtube/commit/8567084892871f335e3b4581048867f571456426))
- add settings menu for always-on-top toggle and persistent theme switching ([d9709cd](https://github.com/limboy/localtube/commit/d9709cdc74dadf2417146cd96aadc5fdd472fa1a))
- move update indicator from sidebar footer to top navigation bar ([dce57f5](https://github.com/limboy/localtube/commit/dce57f58c671325ac059f1fde355b2ec69c78d9e))
- sync sidebar active tab with route location and redirect index to playlist view ([1f38a29](https://github.com/limboy/localtube/commit/1f38a293e59dcfe371dfc1e0da076359ba721d23))
- move update indicator to sidebar footer with responsive collapsed state ([3687317](https://github.com/limboy/localtube/commit/3687317ddc35250ca262a48592b063ad05c75d57))
- implement synchronous theme retrieval to prevent flash of unstyled content on startup ([ff38a76](https://github.com/limboy/localtube/commit/ff38a76f5a4c10762b27ee718b1e5ec4d164f6a5))

### Bug Fixes

- hide tooltip during playlist or channel refresh in app sidebar ([ce88f95](https://github.com/limboy/localtube/commit/ce88f95546649f58e19bd8b3dad477341dc57f57))
- remove redundant cursor-pointer styles from SidebarTrigger and btn-icon utility class ([7e15269](https://github.com/limboy/localtube/commit/7e152692e502705a445d666ab6fe3c0e820701d1))
- prevent main area flash during refresh by only resetting state on source change ([8162446](https://github.com/limboy/localtube/commit/8162446c642486d4b3ea01da14e123c775ed9f02))

### Refactoring

- update sidebar width CSS variables to modern syntax ([6d2b612](https://github.com/limboy/localtube/commit/6d2b612db4c4acdf4d02aa85f97238a4d1718405))
- remove sidebar divider functionality and associated drag-and-drop logic ([3d3cd1c](https://github.com/limboy/localtube/commit/3d3cd1c889348f9f4021bab5051fd32c5d7e09d2))
- replace BookmarkOff with filled BookmarkIcon in sidebar playlist items ([ef27164](https://github.com/limboy/localtube/commit/ef27164f58b575d0f6aa3990ca15bd3d7f8e1fc6))
- fix indentation in sidebar and update bookmark remove button styling ([6ff1e62](https://github.com/limboy/localtube/commit/6ff1e62f6010150c46c44e3c0e1d04d456cf73e0))
- remove video bookmark sorting logic and confirmation dialog for bookmark deletion ([da4f00f](https://github.com/limboy/localtube/commit/da4f00fe4e26f0d287a786266eef18687fbe8076))
- consolidate sidebar data loading and optimize bookmark enrichment with debounced store updates ([8081e40](https://github.com/limboy/localtube/commit/8081e409631ad82346026ec443d5fade5fa581e2))
- wrap refresh button in container and prevent default pointer events to improve interaction stability ([79108ee](https://github.com/limboy/localtube/commit/79108eecd249b2e01288d60d960185b8ac9cba36))
- optimize channel and playlist updates by fetching only the first page and update TS configuration to Node16 ([6699883](https://github.com/limboy/localtube/commit/6699883ba1b52bd0a86863c647023311ec0ff3be))
- remove tab-based navigation and simplify sidebar structure ([76a5962](https://github.com/limboy/localtube/commit/76a5962d3e99450a6f4d4619a29a850fe4416631))
- replace hand-rolled YouTube scraping with youtubei.js ([5aebd34](https://github.com/limboy/localtube/commit/5aebd3486afdf1573ba92482513880f3539b9ff8))
- reduce grid gap and remove index labels from video list player items ([2004f41](https://github.com/limboy/localtube/commit/2004f41997302d4cb822fdd3f93aa7c85f2bc9eb))
- update bookmark item styling and text truncation in sidebar ([05cb539](https://github.com/limboy/localtube/commit/05cb5399749bfac81b8e13d80ba9fd57bbb302e7))
- remove window pinning functionality and adjust navigation layout spacing ([89a4dfb](https://github.com/limboy/localtube/commit/89a4dfbfa6a063f318c9b7f70f561148eaa713fb))
- update bookmark UI to display thumbnails and metadata while enabling direct navigation to bookmarked videos ([c7f58b4](https://github.com/limboy/localtube/commit/c7f58b4c98fbadeb1e079e1ffd2cef194da59ec2))
- move SidebarTrigger to root layout and adjust sidebar header spacing ([b86ade9](https://github.com/limboy/localtube/commit/b86ade9a8a75e6930b9c6c653ebee5c56dbafb7f))
- replace electron-window-state with custom window state management using electron-store ([1401a14](https://github.com/limboy/localtube/commit/1401a1491a9545b4ff3a550fecece665a8055355))
- remove refresh functionality and associated UI elements from video player ([7acaa80](https://github.com/limboy/localtube/commit/7acaa80b715a1f7823a5ffac9618fc3ddf0c63e5))
- remove manual theme switcher and enforce system theme preference globally ([d79227c](https://github.com/limboy/localtube/commit/d79227cdde5ee15681b33e1c69c403c47c2a4fab))
- simplify layout headers and update sidebar button styling to improve consistency ([e9f2db3](https://github.com/limboy/localtube/commit/e9f2db3d342b6bdd177dde4402c05d76024f9457))

### Documentation

- update CHANGELOG for v0.7.2 ([92403a2](https://github.com/limboy/localtube/commit/92403a2c2765eccfc70b0ffad2a442d232cbff2d))

### Styles

- reduce icon size for shuffle and repeat buttons in video player ([9242fcd](https://github.com/limboy/localtube/commit/9242fcde1db9a9d2938d15b8998af173363ae056))
- darken secondary, muted, and accent colors in global CSS variables ([ff131c9](https://github.com/limboy/localtube/commit/ff131c90061e442c03cb440c576fac03b269ab05))

### Chores

- upgrade dependencies, refactor sidebar bookmark removal, and add utility function for bookmark deletion ([0e2c2e3](https://github.com/limboy/localtube/commit/0e2c2e30b693f14ae7a38265a1eaabac25307273))

### Other Changes

- rename Playlist header to Videos in video list player ([49ac437](https://github.com/limboy/localtube/commit/49ac437ecedba6c2595733161f50742b0d65f29a))
- adjust video description rendering and fix main area scrolling ([14c01a6](https://github.com/limboy/localtube/commit/14c01a6829da01ca9dcc15171116a35e2deb029f))

## [v0.7.2](https://github.com/limboy/localtube/compare/v0.7.1...v0.7.2) - 2026-04-20

### Refactoring

- update electron updater interface and type definitions for onUpdateReady event ([0887d59](https://github.com/limboy/localtube/commit/0887d59950bb8948118bb27e1d3da7617417b7fb))

### Documentation

- update CHANGELOG for v0.7.1 ([953108c](https://github.com/limboy/localtube/commit/953108c5918660342d8015d407b79b42a1190c2e))

## [v0.7.1](https://github.com/limboy/localtube/releases/tag/v0.7.1) - 2026-04-20

### Features

- implement automated changelog generation and GitHub release workflow ([d200efe](https://github.com/limboy/localtube/commit/d200efe9ae7ab25c269977ce526d77c33408c848))
- redesign theme switcher with improved system theme resolution and updated icons ([84b4df5](https://github.com/limboy/localtube/commit/84b4df5279c8aa18cafd7162163c08279b9a1309))
- replace dropdown theme switcher with a toggle component and set light as the default theme ([f5bd2f9](https://github.com/limboy/localtube/commit/f5bd2f96ff978bdb59ab2a45afc25f9db75b5dad))

### Refactoring

- update electron updater interface and type definitions for onUpdateReady event ([d0e7711](https://github.com/limboy/localtube/commit/d0e77114b02e51fc042f9f1ea16dc3376a593cd5))
- replace UpdateChecker with a global UpdateIndicator in the navigation bar and automate background update downloads ([dd3ba4a](https://github.com/limboy/localtube/commit/dd3ba4a7c8bf490cf71bc1615973fe55747d90c1))
- update Tailwind syntax to v4 and modernize sidebar styling configurations ([7cf0259](https://github.com/limboy/localtube/commit/7cf0259fe6f369d58593974ae735193f2fc9af1b))
- integrate SidebarTrigger into Nav component and update layout styling ([a6db202](https://github.com/limboy/localtube/commit/a6db20261c3b1dbdda2a29c21dc5c9e5ae43c9b4))
- migrate from Tauri to Electron by replacing the backend and removing all Tauri-specific assets and configurations ([9b2af60](https://github.com/limboy/localtube/commit/9b2af6061a45556d1d163125311f54848e011990))

### Documentation

- add download instructions and update repository clone URL in README ([938263f](https://github.com/limboy/localtube/commit/938263fff5789858965e9e9449bd34866d50793f))
- overhaul README with project features, tech stack, and setup instructions ([e97dd4c](https://github.com/limboy/localtube/commit/e97dd4c219a2649cc76dbfdbd5f663b2a6d5b5f1))

### Styles

- remove negative top margins from sidebar action buttons ([7e404ff](https://github.com/limboy/localtube/commit/7e404ff4fb51a26f69eac1d392b5ef7f2a00275a))

### Other Changes

- init ([dce867c](https://github.com/limboy/localtube/commit/dce867c23bcb4d7136a9936253610f1b1ac576ca))
