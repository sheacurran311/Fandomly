/**
 * Open Graph / Social Crawler Middleware
 *
 * Intercepts requests from social media crawlers (Facebook, Twitter, Discord, etc.)
 * on public pages (/creator/:url, /program/:slug) and returns HTML with dynamic
 * OG meta tags so shared links show the right title, description, and image.
 *
 * Regular browser requests pass through to the SPA.
 */
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { creators, users, loyaltyPrograms } from '@shared/schema';
import { eq } from 'drizzle-orm';

const BOT_UA_PATTERN =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Googlebot|bingbot|Applebot/i;

function isCrawler(ua: string | undefined): boolean {
  return !!ua && BOT_UA_PATTERN.test(ua);
}

function renderOgHtml(meta: {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: string;
}): string {
  const img = meta.image || '/fandomly-logo-with-text.png';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}" />
  <meta property="og:title" content="${escapeHtml(meta.title)}" />
  <meta property="og:description" content="${escapeHtml(meta.description)}" />
  <meta property="og:image" content="${escapeHtml(img)}" />
  <meta property="og:url" content="${escapeHtml(meta.url)}" />
  <meta property="og:type" content="${meta.type || 'website'}" />
  <meta property="og:site_name" content="Fandomly" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
  <meta name="twitter:image" content="${escapeHtml(img)}" />
</head>
<body></body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function ogTagsMiddleware(baseUrl: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isCrawler(req.headers['user-agent'])) {
      return next();
    }

    try {
      // Creator public page: /creator/:creatorUrl
      const creatorMatch = req.path.match(/^\/creator\/([^/]+)\/?$/);
      if (creatorMatch) {
        const creatorUrl = creatorMatch[1];
        const [creator] = await db
          .select({
            displayName: creators.displayName,
            bio: creators.bio,
            imageUrl: creators.imageUrl,
          })
          .from(creators)
          .innerJoin(users, eq(users.id, creators.userId))
          .where(eq(users.username, creatorUrl))
          .limit(1);

        if (creator) {
          return res.send(
            renderOgHtml({
              title: `${creator.displayName} on Fandomly`,
              description:
                creator.bio || `Join ${creator.displayName}'s loyalty program on Fandomly`,
              image: creator.imageUrl || undefined,
              url: `${baseUrl}/creator/${creatorUrl}`,
              type: 'profile',
            })
          );
        }
      }

      // Program public page: /program/:slug
      const programMatch = req.path.match(/^\/program\/([^/]+)\/?$/);
      if (programMatch) {
        const slug = programMatch[1];
        const [program] = await db
          .select({
            name: loyaltyPrograms.name,
            description: loyaltyPrograms.description,
            pageConfig: loyaltyPrograms.pageConfig,
            creatorDisplayName: creators.displayName,
          })
          .from(loyaltyPrograms)
          .innerJoin(creators, eq(creators.id, loyaltyPrograms.creatorId))
          .where(eq(loyaltyPrograms.slug, slug))
          .limit(1);

        if (program) {
          const programLogo = (program.pageConfig as Record<string, unknown>)?.logo as
            | string
            | undefined;
          return res.send(
            renderOgHtml({
              title: `${program.name} by ${program.creatorDisplayName} | Fandomly`,
              description:
                program.description || `Join ${program.name} on Fandomly and earn rewards`,
              image: programLogo || undefined,
              url: `${baseUrl}/program/${slug}`,
            })
          );
        }
      }
    } catch {
      // Fall through to SPA on error
    }

    next();
  };
}
