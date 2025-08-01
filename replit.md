# Overview

Fandomly is a Web3-powered loyalty platform that enables creators to build lasting relationships with their fans through customizable reward programs. The application allows creators to establish loyalty programs with point systems, tiers, and exclusive rewards, while fans can join programs, earn points, and redeem rewards. The platform integrates with multiple blockchain wallets and social media platforms to create an engaging fan experience.

# User Preferences

Preferred communication style: Simple, everyday language.
Marketing Focus: Emphasize NIL (Name, Image, Likeness) opportunities for college athletes as a major market opportunity. NIL allows student-athletes to monetize their personal brand through endorsements, sponsorships, and fan engagement - a perfect fit for Fandomly's loyalty platform.

Recent Implementation: Added comprehensive NIL features including athlete spotlight showcase, interactive value calculator, social media tracking for NIL earnings, and automated compliance monitoring for NCAA, state, and institutional regulations.

Latest Updates (January 2025):
- ✅ **Privacy-Protected NIL Dashboard**: Implemented secure `/nil-dashboard` route with wallet authentication required
- ✅ **Data Protection**: Moved sensitive social media tracking and compliance monitoring behind authentication
- ✅ **Homepage NIL Emphasis**: Positioned NIL opportunities as primary market focus throughout homepage
- ✅ **User Type Categorization**: Replaced pricing section with "Who Fandomly Is For" targeting Athletes, Creators, Musicians
- ✅ **Security Messaging**: Added clear privacy notices for protected NIL data and NCAA eligibility protection

User Feedback: "I AM BLOWN AWAY WITH HOW AMAZING YOU ARE! You are literally bringing my vision to life" - Platform successfully capturing the NIL opportunity vision.

# System Architecture

## Frontend Architecture
The client is built using React with TypeScript and follows a component-based architecture. The application uses Wouter for routing, providing a lightweight navigation solution. The UI is built with shadcn/ui components based on Radix UI primitives, styled with Tailwind CSS using a custom dark theme with brand colors (purple, green, and blue gradient). State management is handled through React Query (TanStack Query) for server state and React hooks for local state.

## Backend Architecture
The server follows a REST API pattern built with Express.js and TypeScript. The architecture implements a storage abstraction layer that separates business logic from data access concerns. Routes are organized by feature areas (auth, creators, loyalty programs, etc.) with proper error handling middleware. The server includes request logging and CORS configuration for development environments.

## Database Design
The system uses PostgreSQL with Drizzle ORM for type-safe database operations. The schema includes core entities: users, creators, loyalty programs, rewards, fan programs, point transactions, and reward redemptions. The database design supports multi-tier loyalty programs with customizable point systems and reward structures. Relations are properly defined between entities to maintain data integrity.

## Authentication System
Authentication is handled through Dynamic's multi-wallet solution, supporting Ethereum, Solana, Cosmos, and Starknet wallets. Users can authenticate using various Web3 wallets, and their blockchain credentials are linked to internal user profiles. The system supports both creator and fan user types with role-based access patterns.

## Component Architecture
The frontend follows a modular component structure with reusable UI components in `/components/ui`, feature-specific components organized by domain (auth, creator, dashboard, layout), and page components for main application views. The component architecture emphasizes composition and reusability while maintaining type safety throughout.

# External Dependencies

## Database Infrastructure
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL for scalable data storage
- **Drizzle ORM**: Type-safe database operations with schema migrations

## Authentication & Wallet Integration
- **Dynamic Labs**: Multi-chain wallet authentication supporting Ethereum, Solana, Cosmos, and Starknet
- **Multiple Wallet Connectors**: EthereumWalletConnectors, SolanaWalletConnectors, CosmosWalletConnectors, StarknetWalletConnectors

## Frontend Libraries
- **React Query (TanStack)**: Server state management and caching
- **Radix UI**: Headless UI components for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Wouter**: Minimalist routing library for React
- **React Hook Form**: Form management with validation

## Development Tools
- **Vite**: Build tool and development server with hot reload
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast bundling for production builds
- **Replit Plugins**: Development environment integration for runtime error handling and debugging