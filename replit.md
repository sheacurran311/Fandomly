# Overview

Fandomly is a Web3-powered loyalty platform that enables creators to build lasting relationships with their fans through customizable reward programs. The application allows creators to establish loyalty programs with point systems, tiers, and exclusive rewards, while fans can join programs, earn points, and redeem rewards. The platform integrates with multiple blockchain wallets and social media platforms to create an engaging fan experience.

# User Preferences

Preferred communication style: Simple, everyday language.
Marketing Focus: Emphasize NIL (Name, Image, Likeness) opportunities for college athletes as a major market opportunity. NIL allows student-athletes to monetize their personal brand through endorsements, sponsorships, and fan engagement - a perfect fit for Fandomly's loyalty platform.

Recent Implementation: Added comprehensive NIL features including athlete spotlight showcase, interactive value calculator, social media tracking for NIL earnings, and automated compliance monitoring for NCAA, state, and institutional regulations.

Latest Updates (November 2025):
- ✅ **Complete Landing Page Redesign**: Edgy, unique UI with 7 distinct sections avoiding generic AI-templated structures
- ✅ **Asymmetrical Hero**: Split canvas with NIL athlete visuals, manifesto headlines, and live animated ticker
- ✅ **Pulse Rail Marquee**: 12 morphing iridescent blobs (optimized from 20 for mobile) with real-time platform metrics
- ✅ **Ops Command Deck**: Diagonal grid with 3 satellite capsules (Social Proof, AI Task Engine, Web3 Rewards)
- ✅ **NIL Collision Course**: Split-screen old vs new NIL comparison with contrasting benefits
- ✅ **Proof of Fandom Timeline**: Vertical scrollytelling with 4-step journey from wallet connection to reward distribution
- ✅ **Chain Constellation Canvas**: Animated multi-chain visualization with Ethereum, Solana, Polygon, Base nodes
- ✅ **Launch Pad CTA**: Perspective-tilted split footer with athlete/creator CTAs
- ✅ **Comprehensive Test Coverage**: All interactive elements and dynamic data have data-testid attributes
- ✅ **Mobile Performance**: Reduced animations, optimized for 90% mobile user base

Previous Updates (September 2025):
- 🟡 **Task Template System Mostly Complete**: Implemented Snag/Kazm-style 3-step template picker workflow with 12 core templates (browsing works locally, creation requires wallet connection)
- ✅ **Local Template Data**: Fixed step 2 browsing by using local PLATFORM_TASK_TYPES instead of API calls  
- ✅ **Template Configuration Forms**: Built configuration interface with platform-specific fields (URLs, points, verification methods)
- ✅ **Authentication Browsing Fix**: Improved Dynamic user ID handling using SDK context for authenticated task creation
- ✅ **Core Templates Display**: 12 predefined templates organized by platform categories (Twitter, Facebook, Instagram, YouTube, TikTok, Spotify)
- ✅ **Template Picker UX**: 3-step flow inspired by Snag's quest interface with platform selection → task type → configuration (basic customization, advanced parity pending)
- ✅ **Facebook SDK Integration Complete**: Full Facebook Business API integration with App ID 4233782626946744
- ✅ **Enhanced Login Status Detection**: Automatic Facebook login status checking on page load with proper session management  
- ✅ **Campaign Management System**: 6 campaign types including Facebook-specific Like/Comment/Share campaigns
- ✅ **CSP Policy Fixed**: Resolved Content Security Policy conflicts between Dynamic SDK and Facebook SDK
- ✅ **Fixed API Parameter Order Issue**: Resolved "not a valid HTTP method" error in creator onboarding by correcting apiRequest parameter order
- ✅ **Database Reset Capability**: Added ability to clean database for fresh testing of onboarding flows
- ✅ **Robust Data Processing**: Fixed server-side array/string handling for all creator type-specific data fields

Previous Updates (August 2025):
- ✅ **Complete Database Field Mapping**: Comprehensive JSONB field mapping for all creator type-specific data (athlete, musician, content creator)
- ✅ **Multi-Path Onboarding Database Integration**: All frontend form fields properly map to database with tenant isolation
- ✅ **Stripe Payment Integration**: Full Stripe customer creation and subscription management with billing data storage
- ✅ **Type-Specific Data Storage**: Athletes store sport/NIL data, musicians store catalog/genre data, content creators store platform/view data
- ✅ **OpenLoyalty Campaign System**: Implemented comprehensive trigger-condition-effect campaign architecture with templates
- ✅ **Multi-Tenant Architecture**: Built complete tenant system where each creator gets their own "store"
- ✅ **Tenant Management**: Full tenant lifecycle with branding, limits, usage tracking, and subscription management
- ✅ **Professional Campaign Templates**: 6 proven templates (Welcome Bonus, Social Follow, Birthday, Purchase, VIP, Referral)
- ✅ **Advanced Campaign Features**: Budget controls, per-member limits, participation tracking, complex condition rules
- ✅ **Privacy-Protected NIL Dashboard**: Implemented secure `/nil-dashboard` route with wallet authentication required
- ✅ **Data Protection**: Moved sensitive social media tracking and compliance monitoring behind authentication
- ✅ **Homepage NIL Emphasis**: Positioned NIL opportunities as primary market focus throughout homepage
- ✅ **User Type Categorization**: Replaced pricing section with "Who Fandomly Is For" targeting Athletes, Creators, Musicians
- ✅ **Security Messaging**: Added clear privacy notices for protected NIL data and NCAA eligibility protection
- ✅ **Role-Based Access Control**: Implemented three-tier RBAC system (Fandomly Admins, Customer Admins, Customer End Users)
- ✅ **RBAC Infrastructure**: Created middleware, hooks, and database schema for comprehensive role management
- ✅ **Unified Onboarding**: Enhanced standard creator onboarding with Olympic and college athlete support, NIL compliance built-in
- ✅ **Dashboard Button Styling**: Fixed Dashboard buttons to match "Explore Programs" brand-primary color scheme
- ✅ **Protected Routes**: Implemented auto-redirect functionality for wallet authentication requirements
- ✅ **Facebook App Compliance**: Created comprehensive Privacy Policy and Data Deletion Instructions pages required for Facebook Business API approval
- ✅ **Separated Authentication Concerns**: Dynamic now only handles initial wallet authentication, backend manages all user data and roles
- ✅ **User Type Switching**: Full implementation allowing users to switch between Fan and Creator roles with proper flow validation
- ✅ **Backend User Management**: All user queries now go through our backend APIs instead of directly to Dynamic for proper data control
- ✅ **RBAC Dashboard Authentication**: Fixed authentication flow to properly recognize users and display role-based content
- ✅ **Facebook Business API Integration**: Added comprehensive Facebook SDK with App ID 4233782626946744 for follower tracking
- ✅ **Clean Dynamic Integration**: Removed custom email verification code and hidden widget overlays - all Dynamic customizations now come from admin dashboard only
- ✅ **Enhanced Landing Page**: Comprehensive mobile-first responsive design with improved UI practices and "Start Now" button consistency
- ✅ **Fixed Creator Onboarding Flow**: New creators now properly route through onboarding (/creator-onboarding) before reaching dashboard
- ✅ **Removed Obsolete RBAC Dashboard**: Eliminated /rbac-dashboard in favor of user-type-specific dashboards (/creator-dashboard, /fan-dashboard)
- ✅ **Programmatic Wallet Connection**: Replaced Dynamic widget overlay with direct authentication flow to bypass admin dashboard email verification settings
- ✅ **Dual Navigation Menus**: Authenticated users see simplified navigation (Marketplace, Dashboard) vs full marketing menu for non-authenticated users

Personal Connection: User has direct family members who would benefit from the platform:
- Brother: USA Olympic Aerial Jumper Medalist
- Nephew 1: College football player (Junior year) 
- Nephew 2: College football player (Freshman year)

Focus: Platform designed for all athletes and creators, with strong NIL compliance and Olympic athlete support built into the standard onboarding experience.

# System Architecture

## Frontend Architecture
The client is built using React with TypeScript and follows a component-based architecture. The application uses Wouter for routing, providing a lightweight navigation solution. The UI is built with shadcn/ui components based on Radix UI primitives, styled with Tailwind CSS using a custom dark theme with brand colors (purple, green, and blue gradient). State management is handled through React Query (TanStack Query) for server state and React hooks for local state.

## Backend Architecture
The server follows a REST API pattern built with Express.js and TypeScript. The architecture implements a storage abstraction layer that separates business logic from data access concerns. Routes are organized by feature areas (auth, creators, loyalty programs, etc.) with proper error handling middleware. The server includes request logging and CORS configuration for development environments.

## Database Design
The system uses PostgreSQL with Drizzle ORM for type-safe database operations with comprehensive multi-tenant architecture:

**Multi-Tenant Structure:**
- `tenants` - Each creator gets their own tenant/store with custom branding, domains, and settings
- `tenant_memberships` - Users can be members of multiple tenants with role-based permissions
- All core entities (creators, loyalty programs, campaigns, rewards) are tenant-scoped for complete data isolation

**Core Entities:**
- Users with RBAC (Fandomly Admin, Customer Admin, Customer End User)
- Tenant-scoped creators, loyalty programs, rewards, campaigns
- OpenLoyalty-style campaign system with triggers, conditions, effects
- Point transactions and reward redemptions with tenant isolation
- Comprehensive campaign participation tracking

The database design supports enterprise-level multi-tenancy with complete data isolation, custom branding per tenant, usage limits, and subscription management.

## Authentication System
**Two-Layer Authentication Architecture:**
- **Layer 1 - Initial Authentication**: Dynamic's multi-wallet solution handles initial wallet authentication (Ethereum, Solana, Cosmos, Starknet)
- **Layer 2 - User Management**: Our backend manages all user data, roles, permissions, and business logic after initial Dynamic authentication

Dynamic is used ONLY for initial wallet connection and token verification. All user queries, role management, and business logic flow through our backend APIs (`/api/auth/user`, `/api/auth/register`). This separation ensures we control user data, roles, and business rules while leveraging Dynamic's robust wallet connectivity.

## Component Architecture
The frontend follows a modular component structure with reusable UI components in `/components/ui`, feature-specific components organized by domain (auth, creator, dashboard, layout), and page components for main application views. The component architecture emphasizes composition and reusability while maintaining type safety throughout.

# External Dependencies

## Facebook Business API Integration
- **App ID**: 4233782626946744 (production-ready app)
- **SDK Version**: v23.0 with automatic login status detection
- **Permissions**: `pages_show_list`, `pages_read_engagement`, `email`, `public_profile`
- **Campaign Support**: Like campaigns (50 pts), Comment campaigns (100 pts), Share campaigns (200 pts)
- **Session Management**: Automatic token storage and validation with session persistence

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