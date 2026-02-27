# CookQuest - Project Structure Documentation

## Overview
CookQuest is a React-based cooking skill learning application built with Vite, TypeScript, and Tailwind CSS. It provides a gamified approach to learning cooking skills through interactive recipes and skill tracking.

## Technology Stack
- **Frontend Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS 4.1.12
- **Routing**: React Router 7.13.0
- **UI Components**: Radix UI components with shadcn/ui
- **Icons**: Lucide React
- **State Management**: React Context API
- **Package Manager**: PNPM (configured with overrides)

## Project Structure

```
CookQuest/
├── .claude/                           # Claude Code configuration
│   └── settings.local.json           # Local Claude settings
├── guidelines/                       # Development guidelines
│   └── Guidelines.md                # AI development guidelines
├── src/                             # Source code directory
│   ├── app/                         # Main application code
│   │   ├── components/              # React components
│   │   │   ├── figma/              # Figma-specific components
│   │   │   │   └── ImageWithFallback.tsx  # Image component with fallback
│   │   │   ├── ui/                 # UI component library (shadcn/ui)
│   │   │   │   ├── accordion.tsx
│   │   │   │   ├── alert-dialog.tsx
│   │   │   │   ├── alert.tsx
│   │   │   │   ├── aspect-ratio.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── breadcrumb.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── calendar.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── carousel.tsx
│   │   │   │   ├── chart.tsx
│   │   │   │   ├── checkbox.tsx
│   │   │   │   ├── collapsible.tsx
│   │   │   │   ├── command.tsx
│   │   │   │   ├── context-menu.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── drawer.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── form.tsx
│   │   │   │   ├── hover-card.tsx
│   │   │   │   ├── input-otp.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── menubar.tsx
│   │   │   │   ├── navigation-menu.tsx
│   │   │   │   ├── pagination.tsx
│   │   │   │   ├── popover.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── radio-group.tsx
│   │   │   │   ├── resizable.tsx
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── slider.tsx
│   │   │   │   ├── sonner.tsx
│   │   │   │   ├── switch.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   ├── toggle-group.tsx
│   │   │   │   ├── toggle.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   ├── use-mobile.ts    # Mobile detection hook
│   │   │   │   └── utils.ts         # Utility functions
│   │   │   ├── CookingTip.tsx       # Cooking tip display component
│   │   │   ├── RecipeCard.tsx       # Recipe card component
│   │   │   └── SkillCard.tsx        # Skill progress card component
│   │   ├── contexts/                # React context providers
│   │   │   └── RecipeContext.tsx    # Recipe completion state management
│   │   ├── pages/                   # Page components
│   │   │   ├── BasicCooking.tsx     # Basic cooking skills page
│   │   │   ├── Dashboard.tsx        # Main dashboard page
│   │   │   └── RecipeDetail.tsx     # Individual recipe detail page
│   │   ├── App.tsx                  # Main app component
│   │   └── routes.ts                # Application routing configuration
│   ├── styles/                      # Styling files
│   │   ├── fonts.css               # Font definitions
│   │   ├── index.css               # Main CSS entry point
│   │   ├── tailwind.css            # Tailwind CSS directives
│   │   └── theme.css               # Theme variables and customizations
│   └── main.tsx                     # Application entry point
├── index.html                       # HTML template
├── package.json                     # Package configuration
├── postcss.config.mjs              # PostCSS configuration
├── vite.config.ts                  # Vite build configuration
├── ATTRIBUTIONS.md                 # Third-party attributions
└── README.md                       # Project documentation
```

## Key Components and Features

### Application Architecture
- **App.tsx**: Root component that provides RecipeProvider context and RouterProvider
- **routes.ts**: Defines application routes using React Router
- **main.tsx**: Entry point that renders the App component

### State Management
- **RecipeContext**: Manages recipe completion state with localStorage persistence
  - Tracks completed recipes across three skill categories
  - Provides progress calculation for each skill
  - Uses React Context API for state sharing

### Pages
1. **Dashboard**: Main landing page showing skill progress and cooking tips
2. **BasicCooking**: Dedicated page for basic cooking skills
3. **RecipeDetail**: Individual recipe view with detailed instructions

### Component Library
The project uses a comprehensive UI component library based on Radix UI and shadcn/ui, providing:
- Form components (inputs, selects, checkboxes, etc.)
- Navigation components (menus, breadcrumbs, pagination)
- Feedback components (alerts, dialogs, tooltips)
- Layout components (cards, separators, aspect-ratio)
- Data display components (tables, charts, badges)

### Styling System
- **Tailwind CSS 4.1.12**: Utility-first CSS framework
- **Custom themes**: Defined in theme.css
- **Font management**: Custom font definitions in fonts.css
- **Responsive design**: Mobile-first approach with responsive utilities

### Skill System
The application organizes recipes into three main skill categories:
1. **Basic Cooking**: Fundamental skills (boiled-egg, make-rice, chop-onion)
2. **Heat Control**: Temperature management skills (sear-steak, simmer-soup, deep-fry, etc.)
3. **Flavor Building**: Seasoning and flavor skills (make-sauce, season-taste, herb-pairing, etc.)

## Development Configuration

### Build System
- **Vite**: Fast build tool with React and Tailwind plugins
- **TypeScript**: Type safety and developer experience
- **Path aliases**: `@` mapped to `src` directory
- **Asset handling**: Support for SVG and CSV raw imports

### Package Management
- Uses PNPM with Vite version override
- Peer dependencies for React and React DOM marked as optional
- Comprehensive UI component dependencies from Radix UI ecosystem

### Code Organization
- **Component separation**: UI components separate from business logic
- **Context-based state**: Centralized recipe state management
- **Type safety**: Full TypeScript implementation
- **Asset optimization**: Proper image handling with fallbacks

## Getting Started

1. **Install dependencies**: `npm i`
2. **Start development server**: `npm run dev`
3. **Build for production**: `npm run build`

## External Dependencies and Attributions
- **shadcn/ui components**: MIT licensed UI component library
- **Unsplash photos**: Used under Unsplash license
- **Radix UI**: Accessible UI component primitives
- **Lucide React**: Icon library for React

This project structure supports a scalable, maintainable cooking education application with modern React development practices and a comprehensive UI component system.