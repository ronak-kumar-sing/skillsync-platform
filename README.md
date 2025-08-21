# SkillSync Platform

A comprehensive skill-sharing and mentorship platform built with Next.js 14, TypeScript, and Tailwind CSS.

## Project Structure

```
src/
├── app/                    # Next.js 14 App Router
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   ├── layout/            # Layout components
│   └── features/          # Feature-specific components
├── hooks/                 # Custom React hooks
├── services/              # API services and data fetching
├── styles/                # Global styles and Tailwind config
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions and helpers
```

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with glassmorphism design system
- **State Management**: Zustand
- **Forms**: React Hook Form with Joi validation
- **HTTP Client**: TanStack Query
- **Real-time**: Socket.IO
- **Authentication**: JWT with bcryptjs
- **Animations**: Framer Motion

## Design System

The project uses a glassmorphism design system with:

- Custom glass components and utilities
- Consistent color palette with primary, secondary, and accent colors
- Smooth animations and transitions
- Responsive design patterns
- Accessibility-first approach

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## Code Quality

The project enforces code quality through:

- **ESLint**: Configured with Next.js, TypeScript, and Prettier rules
- **Prettier**: Consistent code formatting with Tailwind CSS plugin
- **TypeScript**: Strict mode with comprehensive type checking
- **Husky**: Git hooks for pre-commit checks (to be configured)

## Glassmorphism Components

The design system includes pre-built glassmorphism components:

- `.glass-card` - Basic glass card
- `.glass-button` - Interactive glass button
- `.glass-input` - Glass input field
- `.glass-nav` - Navigation glass
- `.glass-modal` - Modal glass
- `.glass-sidebar` - Sidebar glass
- And many more utility classes

## Contributing

1. Follow the established project structure
2. Use TypeScript for all new files
3. Follow the glassmorphism design patterns
4. Write meaningful commit messages
5. Ensure all linting and type checks pass

## License

This project is private and proprietary.