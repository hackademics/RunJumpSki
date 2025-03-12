# RunJumpSki

A first-person speedrun game inspired by Tribes 2's skiing mechanics. Core gameplay focuses on maintaining momentum through skillful terrain traversal, managing jetpack energy, and shooting targets while avoiding or destroying turrets.

## Project Overview

RunJumpSki combines fluid movement mechanics with shooting elements, emphasizing speed and skill. The game is built using TypeScript and Babylon.js, with Cloudflare for hosting and backend services.

### Key Technical Choices

- **TypeScript** for type safety and better development experience
- **Babylon.js** as the core 3D engine for rendering and physics
- **Vite** for fast development and building
- **Component-based architecture** for modularity and flexibility
- **Cloudflare ecosystem** for hosting and backend services

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/runjumpski.git
   cd runjumpski
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The game will be available at `http://localhost:3000`.

## Project Structure

```
runjumpski/
├── src/               # Source code
│   ├── types/         # TypeScript type definitions
│   ├── core/          # Core game systems
│   ├── components/    # Entity components
│   ├── entities/      # Game entities
│   ├── terrain/       # Terrain systems
│   ├── ui/            # User interface
│   ├── utils/         # Utility functions
│   ├── effects/       # Visual effects
│   └── index.ts       # Main entry point
├── workers/           # Cloudflare Workers
├── public/            # Static assets
├── tests/             # Test files
└── ...
```

## Development

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build locally
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run deploy` - Deploy to Cloudflare

### Key Technologies

- **Babylon.js** - 3D rendering and physics
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast development and building
- **Jest** - Testing framework
- **ESLint/Prettier** - Code quality and formatting
- **Cloudflare Workers** - Serverless backend

## Game Features

- **Skiing Mechanics** - Slope-based acceleration and momentum conservation
- **Jetpack System** - Energy management and aerial control
- **Weapons** - Projectile physics with velocity inheritance
- **Terrain** - Dynamic terrain with surface properties
- **Targets & Turrets** - Interactive game elements

## Deployment

The game is deployed using Cloudflare Pages and Workers. Configure your deployment in the `wrangler.toml` file.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT License](LICENSE)

## Acknowledgments

- Inspired by Tribes 2's skiing mechanics
- Built with Babylon.js