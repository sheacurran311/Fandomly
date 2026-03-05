# Tech Stack & Next.js Conversion Guide

**Our app uses:** React 18 + Vite 5 + TypeScript (Express backend, Wouter for routing).

When adapting examples from Next.js, ask the agent to convert them to this stack. Key mappings:

| Next.js                                 | Our Stack                            |
| --------------------------------------- | ------------------------------------ |
| `pages/` or `app/` routing              | Wouter client-side routing           |
| `getServerSideProps` / `getStaticProps` | Express API routes + TanStack Query  |
| `next/image`                            | Standard `<img>` or custom component |
| `next/link`                             | Wouter's `<Link>`                    |
| `use client` / `use server`             | Not applicable (all client-side)     |
| API routes (`pages/api/`)               | Express routes in `server/`          |
| File-based routing                      | Manual route definitions with Wouter |

**Note:** Convert examples to TypeScript with proper types/interfaces.
