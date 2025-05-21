# ShamsCloud File Storage Application

## Overview

ShamsCloud is a cloud storage application with a modern React frontend and Express.js backend. The application is built with a focus on accessibility and internationalization, allowing users to store, manage, and share files. It features user authentication, file management capabilities, and an admin interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and uses a component-based architecture with the Shadcn UI component library. The application follows modern React patterns including:

- Context-based state management through various providers (Auth, Locale, Accessibility, Theme)
- React Query for data fetching and state management
- React Hook Form for form handling
- Wouter for routing (lightweight alternative to React Router)

The UI is styled using Tailwind CSS with a design system that supports light/dark mode and accessibility features.

### Backend Architecture

The backend is a Node.js Express server that:

- Serves the React application in production
- Provides RESTful API endpoints for authentication and file operations
- Handles file uploads using Multer
- Manages user sessions
- Connects to a PostgreSQL database via Drizzle ORM

### Data Layer

- PostgreSQL database accessed through Drizzle ORM
- Schema defined in `shared/schema.ts` with tables for users and files
- Connection handled through environment variables

## Key Components

### Frontend Components

1. **Provider Components** (`/client/src/providers/`)
   - `AuthProvider`: Manages user authentication state
   - `LocaleProvider`: Handles internationalization (supports English and Russian)
   - `AccessibilityProvider`: Controls accessibility features
   - `ThemeProvider`: Manages light/dark mode

2. **Page Components** (`/client/src/pages/`)
   - `Home`: Landing page
   - `Auth`: Login, registration, and password reset
   - `Dashboard`: File management interface
   - `Admin`: Administrative interface

3. **UI Components** (`/client/src/components/ui/`)
   - Shadcn UI components (buttons, inputs, modals, etc.)
   - Custom components like `Logo`, `Header`, `Footer`

4. **File Management Components** (`/client/src/components/FileExplorer/`)
   - `FileList`: Displays files and folders
   - `FileUpload`: Handles file uploading
   - `FileActions`: Contains file operations (delete, rename, etc.)
   - `StorageQuota`: Shows storage usage

### Backend Components

1. **Authentication** (`/server/auth.ts`)
   - User registration, login, and session management
   - Password hashing with bcrypt

2. **File Management** (`/server/files.ts`)
   - File upload handling with Multer
   - CRUD operations for files and folders

3. **Storage Interface** (`/server/storage.ts`)
   - Database operations for users and files
   - Quota management

4. **API Routes** (`/server/routes.ts`)
   - RESTful endpoints for the frontend

## Data Flow

1. **Authentication Flow**
   - User submits credentials via the Auth page
   - Frontend sends request to `/api/auth/login` or `/api/auth/register`
   - Backend validates credentials, creates/verifies user in database
   - Session is established, and user data is returned to frontend
   - AuthProvider updates application state to reflect authentication

2. **File Management Flow**
   - User navigates to Dashboard to view files
   - FileList component fetches files from `/api/files`
   - User can upload files via FileUpload component
   - Files are stored on disk in the `/uploads` directory
   - File metadata is stored in the database

3. **Admin Operations Flow**
   - Admin users can access the Admin page
   - UserManagement component fetches users from `/api/admin/users`
   - Admin can manage users (update quotas, block users, etc.)

## External Dependencies

### Frontend Dependencies
- React for UI rendering
- TanStack Query for data fetching
- Shadcn UI and Radix UI for components
- Tailwind CSS for styling
- Wouter for routing
- Lucide for icons

### Backend Dependencies
- Express.js for the server
- Drizzle ORM for database access
- Multer for file uploads
- Bcrypt for password hashing
- Express-session for session management

## Deployment Strategy

The application is set up for deployment on Replit with the following configuration:

1. **Development Mode**
   - Run with `npm run dev`
   - Uses Vite's development server for the frontend
   - API requests proxied to Express backend

2. **Production Build**
   - Frontend built with Vite (`npm run build`)
   - Backend bundled with esbuild
   - Static files served by Express from the `/dist/public` directory

3. **Database**
   - PostgreSQL 16 module in Replit
   - Connection string from environment variable `DATABASE_URL`
   - Schema migrations managed by Drizzle

4. **Environment Setup**
   - Required environment variables:
     - `DATABASE_URL`: PostgreSQL connection string
     - `NODE_ENV`: For development/production modes

## Getting Started

1. Ensure PostgreSQL database is properly provisioned in Replit
2. Run `npm install` to install dependencies
3. Set up the database schema with `npm run db:push`
4. Start the development server with `npm run dev`
5. For production, build the app with `npm run build` and start with `npm run start`

## Areas for Improvement

1. The codebase appears to have some incomplete implementations, particularly in the server files
2. Error handling could be more robust throughout the application
3. The default storage implementation is in-memory, which should be replaced with a database-backed implementation