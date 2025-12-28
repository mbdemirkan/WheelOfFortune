# Çarkıfelek

A web-based Wheel of Fortune (Çarkıfelek) game built with Vanilla JavaScript and Vite.

## Prerequisites

- [Node.js](https://nodejs.org/) (Version 16 or higher recommended)
- [npm](https://www.npmjs.com/) (Should come with Node.js)

## Installation

1. Navigate to the project directory:
   ```bash
   cd c:/Development/denemeler/WheelOfFortune
   ```
   *(Or wherever you have cloned/saved the project)*

2. Install dependencies:
   ```bash
   npm install
   ```

## Running Locally (Development)

To start the development server with hot-reload:

```bash
npm run dev
```

The game should now be accessible at `http://localhost:5173/` (or the port shown in your terminal).

## Building for Production

To create an optimized build for deployment:

```bash
npm run build
```

The output files will be in the `dist/` directory.

## Project Structure

- `index.html`: Main entry point.
- `main.js`: Core game logic.
- `style.css`: All styling (layout, themes).
- `puzzles.json`: Database of puzzles.
- `resources/`: Audio and other assets.
