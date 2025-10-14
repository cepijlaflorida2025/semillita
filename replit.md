# Semillita - Emotional Journaling App for Children

## Overview

Semillita is a mobile-first web application designed for children aged 8-12 that combines emotional journaling with plant care. The app helps children track their emotions while nurturing virtual plants, creating a meaningful connection between emotional wellbeing and growth. It supports both workshop (guided) and home (autonomous) modes, with proper parental consent mechanisms to comply with child safety regulations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: Zustand with persistence for local user state and app preferences
- **Data Fetching**: TanStack Query for server state management and caching
- **UI Framework**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation

The frontend follows a mobile-first responsive design approach with a maximum width constraint to simulate a mobile app experience. Components are organized into reusable UI components, page components, and custom hooks for business logic.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **File Storage**: In-memory mock storage (designed to be easily replaced with cloud storage)
- **API Design**: RESTful API with proper error handling and request logging
- **Validation**: Zod schemas shared between client and server

The backend uses a layered architecture with separate concerns for routing, storage operations, and business logic. The storage layer is abstracted through interfaces to allow for easy testing and future database changes.

### Database Design
The schema is designed around child safety and educational features:
- **Users**: Child profiles with parental consent tracking
- **Plants**: Virtual plants with growth milestones and photo tracking
- **Journal Entries**: Emotional logs with multimedia support (photos, audio)
- **Emotions**: Predefined emotion types with visual representations
- **Achievements**: Gamification system to encourage engagement
- **Seeds**: Collection system for earned virtual seeds
- **Notifications**: Push notification management

### Authentication and Safety
- Parental consent system compliant with COPPA regulations
- Workshop mode for guided facilitated sessions
- No traditional authentication - uses local storage with parental email verification
- All user data is associated with parental consent records

### Media Handling
- Camera integration for plant photos and user avatars
- Audio recording for voice journal entries
- File upload with size limits and type validation
- Mock file storage system ready for cloud provider integration

### Gamification System
- Points-based reward system
- Achievement tracking for engagement milestones
- Virtual seed collection as collectibles
- Progress tracking for plant care and emotional journaling consistency

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations with PostgreSQL dialect
- **@tanstack/react-query**: Data fetching and caching library
- **wouter**: Lightweight routing library for React

### UI and Styling
- **@radix-ui/***: Accessible component primitives for complex UI patterns
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for managing component variants
- **lucide-react**: Consistent icon library

### Form and Validation
- **react-hook-form**: Performant form library with minimal re-renders
- **@hookform/resolvers**: Validation resolvers for React Hook Form
- **zod**: Schema validation library used across client and server

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Type safety across the entire application
- **eslint/prettier**: Code linting and formatting (implied from modern setup)

### Audio/Visual Features
- **Native Web APIs**: Camera API, MediaRecorder API for multimedia features
- **Canvas API**: Image processing for photo capture functionality

The application is designed to work primarily offline-first with synchronization capabilities, making it suitable for workshop environments with limited connectivity.