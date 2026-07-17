# Rail Map Painter

Rail Map Painter is a React/TypeScript web application for creating interactive subway/railway maps. It provides an SVG canvas where users can drag stations, connect them with lines, and export their maps as SVG, PNG, or JSON files.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Prerequisites and Setup
- Install Node.js 20+ and npm (confirmed working with Node.js v20.19.5 and npm v10.8.2)
- Run `git clone https://github.com/railmapgen/rmp.git && cd rmp`

### Bootstrap, Build, and Test the Repository
- `npm install` -- takes ~24 seconds. Install all dependencies.
- `npm run lint` -- takes ~8 seconds. Run ESLint on the src directory.
- `npm run lint:fix` -- takes ~8 seconds. Run ESLint with automatic fixes.
- `npm run test` -- takes ~12 seconds. Run Vitest unit tests. NEVER CANCEL.
- `npm run build` -- takes ~51 seconds. Build for production with TypeScript compilation and Vite bundling. NEVER CANCEL. Set timeout to 90+ seconds.

### Run the Development Environment
- **ALWAYS run the bootstrapping steps first.**
- Development server: `npm run dev` -- starts Vite dev server on http://localhost:5173/rmp/
- Preview production build: `npm run preview` -- serves built files on http://localhost:4173/rmp/

### Build Script Validation
- The complete build process (./scripts/build.sh) runs lint:fix, test, and build sequentially
- **NEVER CANCEL builds or tests** - they are designed to complete within reasonable timeframes

## Validation

### Manual Application Testing
- **ALWAYS manually validate any changes** by running the development server and testing the core functionality
- Test the tutorial flow: The app loads with an interactive Shanghai Metro tutorial
- Test station manipulation: Drag stations around the canvas and verify lines update automatically
- Test line creation: Use the 135° diagonal path tool to connect stations
- Test color changes: Modify line colors using the color picker in the left sidebar
- Test station types: Change station types (basic to interchange) using the details panel
- **VALIDATION SCENARIOS**: Always test at least one complete end-to-end scenario after making changes:
  1. Load the app
  2. Create a new line between two stations
  3. Change the line color
  4. Add a station
  5. Verify all elements render correctly

### Pre-commit Validation
- Always run `npm run lint:fix` before committing changes or the CI (.github/workflows/code-check.yml) will fail
- Always run `npm run test` to ensure no test regressions
- The CI pipeline runs on pull requests and executes `npm run lint` and `npm run test`

## Common Tasks

### Repository Structure
```
/home/runner/work/rmp/rmp/
├── .github/workflows/          # CI/CD pipelines
├── docs/                       # Documentation (developer guide, station guide, etc.)
├── public/                     # Static assets (images, fonts, manifest)
├── scripts/                    # Build scripts
├── src/                        # Source code
│   ├── components/            # React components
│   │   ├── svgs/             # SVG station/line/node components
│   │   │   ├── stations/     # Station type implementations
│   │   │   └── ...
│   │   └── ...
│   ├── constants/            # Type definitions and constants
│   ├── redux/               # Redux store and slices
│   ├── util/                # Utility functions
│   └── ...
├── package.json              # Dependencies and scripts
├── vite.config.mts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── eslint.config.js        # ESLint configuration
```

### Key Files and Locations
- **Station implementations**: `src/components/svgs/stations/` - Contains all station type components
- **Line styles**: `src/constants/lines.ts` - Line path and style definitions
- **Type definitions**: `src/constants/constants.ts` - Core interfaces and enums
- **Save/load logic**: `src/util/save.ts` - Project serialization and version upgrades
- **Tests**: Files ending in `.test.ts` or `.test.tsx` throughout src/
- **Documentation**: `docs/stations.md`, `docs/developer-guide.md`, `docs/nodes.md`

### Application Architecture
- **Frontend**: React 18 with TypeScript, Redux Toolkit for state management
- **Build tool**: Vite 7 with TypeScript compilation
- **Testing**: Vitest with jsdom environment
- **Styling**: Chakra UI component library with Emotion
- **Canvas**: SVG-based drawing with interactive elements
- **Internationalization**: react-i18next for multiple language support

### Package.json Scripts Reference
```json
{
  "dev": "vite --host",           // Development server
  "build": "tsc && vite build",   // Production build
  "test": "vitest",               // Run tests
  "lint": "eslint ./src",         // Lint source code
  "lint:fix": "eslint ./src --fix", // Lint and fix
  "preview": "vite preview"       // Preview production build
}
```

### Adding New Features
- **Stations**: Follow the comprehensive guide in `docs/stations.md` - requires React component, TypeScript interface, default attributes, attribute editor, icon, and registration
- **Line styles**: Add to `src/constants/lines.ts` and implement rendering logic
- **Miscellaneous nodes**: Add to `src/constants/nodes.ts` for badges, text, facilities
- **Save version upgrades**: Update `src/util/save.ts` when adding new features that affect saved projects

### Development Workflow
- **Code style**: Uses Prettier (config in .prettierrc) and ESLint (config in eslint.config.js)
- **Git workflow**: Main branch is `main` (renamed from v5). Previous main is now `v3`
- **Testing**: Unit tests with Vitest, component tests with React Testing Library
- **Type safety**: Strict TypeScript configuration with comprehensive type definitions

### Performance Notes
- Build process includes code splitting and legacy browser support via @vitejs/plugin-legacy
- Manual chunks configured for react, chakra-ui, and rmg-palette dependencies
- SVG rendering optimized for interactive performance on large maps
- Development server includes HMR (Hot Module Replacement) for fast iteration

### Troubleshooting
- If development server fails to start, ensure Node.js 20+ and npm are installed
- If tests fail with module resolution errors, run `npm install` to ensure all dependencies are available
- If build fails, check TypeScript errors with `tsc --noEmit`
- External style dependencies are proxied from railmapgen.org in development mode

## CRITICAL Timing Information
- **npm install**: ~24 seconds
- **npm run lint**: ~8 seconds  
- **npm run test**: ~12 seconds - NEVER CANCEL
- **npm run build**: ~51 seconds - NEVER CANCEL, set timeout to 90+ seconds
- **Development server startup**: ~1-2 seconds

Always wait for builds and tests to complete. These are automated processes designed to finish within reasonable timeframes.