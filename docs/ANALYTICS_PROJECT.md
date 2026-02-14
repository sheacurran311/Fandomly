Here’s a single markdown doc you can drop into your internal repo (e.g. `/docs/analytics-capabilities.md`). It focuses on **creator-side analytics** (your main value) plus what’s feasible on **fan-side**, with key metrics and example API calls you can wrap in Node/TS services and persist in Postgres.

***

# Cross‑network analytics capabilities (for Node/TS + Postgres)

## Legend

- **Scope**
  - Creator: analytics for the creator’s own content/account
  - Fan: analytics about a fan’s own activity
- **Access**
  - Public: public metrics, basic auth
  - Private: requires OAuth + special scopes / higher tiers

***

## X (Twitter) – PAYG Metrics

### Creator‑side analytics

**Key metrics**

- Per‑post:
  - `retweet_count`, `reply_count`, `like_count`, `quote_count` (public).  
  - `impression_count`, `url_link_clicks`, `user_profile_clicks`, `detail_expands`, etc. (non‑public/organic, depending on product). [docs.x](https://docs.x.com/x-api/fundamentals/metrics)
- Per‑account:
  - Tweet volume over time, aggregate engagement, follower counts via user endpoints.

**Example: single post analytics**

```http
GET https://api.x.com/2/tweets/{tweet_id}?tweet.fields=public_metrics,non_public_metrics,organic_metrics
Authorization: Bearer {CREATOR_ACCESS_TOKEN}
```

- Store in Postgres:
  - `x_tweets(id, creator_id, text, created_at, public_metrics_jsonb, private_metrics_jsonb)`  
  - Upsert regularly or via webhooks/cron.

**Bulk analytics (campaign)**

- Use batch endpoints (where available) to fetch metrics for many posts by ID sets. [docs.x](https://docs.x.com/x-api/enterprise-gnip-2.0/fundamentals/engagement-api)

### Fan‑side analytics

- Same endpoints, but for fan‑owned posts:
  - `GET /2/users/{fan_id}/tweets` + metrics fields.  
- Good for a “top supporters who tweet about you” view if they opt in.

**Gaps**

- Deeper historic or unowned post analytics may require enterprise products. [docs.x](https://docs.x.com/x-api/enterprise-gnip-2.0/fundamentals/engagement-api)

***

## Kick

Docs: https://docs.kick.com/ [discord](https://discord.com/developers/docs/reference)

### Creator‑side analytics

**Key metrics**

- Per‑stream:
  - Live status, `viewer_count`, start/end times (derive duration), category, title.  
- Per‑channel:
  - Follower counts, possibly subscriber counts and other metadata.  
- Chat:
  - Messages per minute, unique chatters, emote usage (from chat endpoints/events). [reddit](https://www.reddit.com/r/Kick/comments/1kfv60e/built_a_full_kick_stream_analytics_site_realtime/)

**Example: current live stream**

```http
GET https://api.kick.com/apis/livestreams?channel_id={creator_channel_id}
Authorization: Bearer {CREATOR_ACCESS_TOKEN}
```

**Example: channel info**

```http
GET https://api.kick.com/apis/channels/{creator_channel_id}
Authorization: Bearer {CREATOR_ACCESS_TOKEN}
```

- DB tables:
  - `kick_streams(id, creator_id, started_at, ended_at, peak_viewers, avg_viewers, chat_messages, unique_chatters)`  
  - `kick_channels(id, creator_id, followers, subs, last_synced_at)`

### Fan‑side analytics

- If Kick exposes per‑user watch/chat events:
  - For each fan: minutes watched per stream, chat messages count, rewards redeemed.  
- You’ll likely build this from **events you subscribe to**, not a single analytics endpoint.

**Gaps**

- Limited historical analytics; you must **record events in real time** for long‑term stats.  
- Per‑user watch time may be indirect/approximate.

***

## Instagram (Graph API – Business/Creator Only)

Docs (good overview): [elfsight](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)

### Creator‑side analytics

**Media listing**

```http
GET https://graph.facebook.com/v19.0/{ig-user-id}/media?fields=id,caption,media_type,media_url,permalink,timestamp
Authorization: Bearer {PAGE_ACCESS_TOKEN}
```

**Media insights**

```http
GET https://graph.facebook.com/v19.0/{media-id}/insights
  ?metric=impressions,reach,engagement,saved,video_views
Authorization: Bearer {PAGE_ACCESS_TOKEN}
```

**Account insights**

```http
GET https://graph.facebook.com/v19.0/{ig-user-id}/insights
  ?metric=impressions,reach,profile_views,follower_count
  &period=day
Authorization: Bearer {PAGE_ACCESS_TOKEN}
```

**Key metrics**

- Per‑media:
  - `impressions`, `reach`, `engagement`, `saved`, `video_views`, `like_count`, `comments_count`. [improvado](https://improvado.io/blog/instagram-analytics-dashboard)
- Per‑account:
  - Follower count, reach, profile views, impressions over time. [elfsight](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)

- DB tables:
  - `ig_media(id, creator_id, caption, media_type, posted_at, metrics_jsonb)`  
  - `ig_account_insights(creator_id, date, impressions, reach, follower_count, profile_views)`

### Fan‑side analytics

- Only if a fan is also a Business/Creator account:
  - Same endpoints but for their own `ig-user-id`.  
- For regular fans: no analytics.

**Gaps**

- No insights for personal accounts via official APIs.  
- No per‑viewer analytics.

***

## Facebook (Pages)

### Creator‑side analytics

**Post metrics (quick way)**

```http
GET https://graph.facebook.com/v19.0/{post-id}
  ?fields=shares,comments.limit(0).summary(true),reactions.limit(0).summary(true)
Authorization: Bearer {PAGE_ACCESS_TOKEN}
```

- Gives:
  - `shares.count`  
  - `comments.summary.total_count`  
  - `reactions.summary.total_count`. [stackoverflow](https://stackoverflow.com/questions/23859556/facebook-graph-api-endpoint-for-getting-likes-shares-comments-for-posts)

**Page insights**

Use Page Insights endpoints to fetch:

- `page_impressions`, `page_views_total`, `page_fans`, etc.  
(Exact endpoint/metrics depend on what you choose to support.)

- DB tables:
  - `fb_posts(id, page_id, message, created_at, metrics_jsonb)`  
  - `fb_page_insights(page_id, date, fans, impressions, views, engaged_users)`

### Fan‑side analytics

- None meaningful via official APIs; FB is page‑centric.

**Gaps**

- Detailed audience demographics limited; ensure compliance with Meta policies if you use them.

***

## YouTube (Data + Analytics APIs)

### Creator‑side analytics

**Basic stats (Data API)**

```http
GET https://www.googleapis.com/youtube/v3/videos
  ?part=statistics,snippet
  &id={video_id}
  &key={API_KEY_OR_OAUTH}
```

- `statistics`: `viewCount`, `likeCount`, `commentCount`, etc.  
- `snippet`: title, publishedAt, tags.

**Channel stats**

```http
GET https://www.googleapis.com/youtube/v3/channels
  ?part=statistics,snippet
  &id={channel_id}
```

**Advanced analytics (YouTube Analytics API)**

```http
GET https://youtubeanalytics.googleapis.com/v2/reports
  ?ids=channel==MINE
  &metrics=views,watch_time,average_view_duration,subscribers_gained
  &dimensions=day
  &startDate=YYYY-MM-DD
  &endDate=YYYY-MM-DD
```

**Key metrics**

- Per‑video: views, likes, comments, average view duration, watch time, subscribers gained/lost.  
- Per‑channel: daily views, watch time, subs, etc.

- DB tables:
  - `yt_videos(id, channel_id, title, published_at, statistics_jsonb)`  
  - `yt_analytics_daily(channel_id, date, views, watch_time, avg_view_duration, subs_gained, subs_lost)`

### Fan‑side analytics

- Only for their *own* channel if they are creators:
  - Same Analytics API restricted to their channel.  
- No viewer‑specific analytics.

**Gaps**

- No per‑viewer metrics accessible.

***

## Twitch (Helix + EventSub)

Docs: https://dev.twitch.tv/docs/api/reference [dev.twitch](https://dev.twitch.tv/docs/api/reference)

### Creator‑side analytics

**Current stream data**

```http
GET https://api.twitch.tv/helix/streams?user_id={creator_id}
Client-Id: {CLIENT_ID}
Authorization: Bearer {CREATOR_ACCESS_TOKEN}
```

- `viewer_count`, `started_at`, `game_name`, `title`. [dev.twitch](https://dev.twitch.tv/docs/api/reference)

**Followers**

```http
GET https://api.twitch.tv/helix/channels/followers?broadcaster_id={creator_id}
Client-Id: {CLIENT_ID}
Authorization: Bearer {CREATOR_ACCESS_TOKEN}
```

- Follower count + individual followers. [dev.twitch](https://dev.twitch.tv/docs/api/reference)

**Subscriptions (if allowed)**

```http
GET https://api.twitch.tv/helix/subscriptions?broadcaster_id={creator_id}
Client-Id: {CLIENT_ID}
Authorization: Bearer {CREATOR_ACCESS_TOKEN}
```

**EventSub**

- Receive events for stream online/offline, follows, subs, raids, etc., and store them for time‑series analytics.

- DB tables:
  - `twitch_streams(id, creator_id, started_at, ended_at, peak_viewers, avg_viewers, followers_gained, subs_gained)`  
  - `twitch_channel_daily(creator_id, date, followers_total, avg_ccv, max_ccv)`

### Fan‑side analytics

- Build from your own EventSub/chat logs:
  - messages sent per stream, bits used, etc.  
- No dedicated “watch time per user” endpoint; approximate.

**Gaps**

- All deep analytics require your own event ingestion and aggregation.

***

## Discord

No official analytics API; everything is **derived from events**.

### Creator‑side analytics (per server with your bot)

**Membership over time**

- Use Gateway `GUILD_MEMBER_ADD`/`GUILD_MEMBER_REMOVE` or periodic member counts:
  - `GET /guilds/{guild.id}/members?limit=1` (for count via headers, or use library introspection). [discord](https://discord.com/developers/docs/resources/guild)

**Activity**

- `MESSAGE_CREATE` events: count messages per day, per channel, per user. [discord](https://discord.com/developers/docs/events/gateway-events)
- `MESSAGE_REACTION_ADD` events: reactions per message, per emoji. [discord](https://discord.com/developers/docs/events/gateway-events)

- DB tables:
  - `discord_guild_daily(guild_id, date, member_count, messages_count, unique_senders)`  
  - `discord_channel_activity(guild_id, channel_id, date, messages_count)`  
  - `discord_user_activity(guild_id, user_id, date, messages_count, reactions_count)`

### Fan‑side analytics

- For each fan (per guild):
  - time since join, roles, messages, reactions.  
- Good for “top community supporters” analytics.

**Gaps**

- No analytics for servers without your bot or without the right intents.

***

## Spotify

Docs: https://developer.spotify.com/documentation/web-api [developer.spotify](https://developer.spotify.com/documentation/web-api)

### Creator‑side analytics

Public Web API has **very limited creator analytics**:

**Artist profile**

```http
GET https://api.spotify.com/v1/artists/{artist_id}
Authorization: Bearer {ACCESS_TOKEN}
```

- `followers.total`, `popularity`. [developer.spotify](https://developer.spotify.com/documentation/web-api/reference/get-track)

**Top tracks**

```http
GET https://api.spotify.com/v1/artists/{artist_id}/top-tracks?market=US
Authorization: Bearer {ACCESS_TOKEN}
```

- Track popularity and audio features (via extra calls).

- DB tables:
  - `spotify_artists(id, name, followers, popularity, last_synced_at)`  
  - `spotify_artist_top_tracks(artist_id, track_id, rank, popularity)`

**Gaps**

- Spotify for Artists analytics (stream counts, listeners, etc.) are **not exposed** via the public Web API. [community.latenode](https://community.latenode.com/t/retrieving-follower-and-following-data-using-spotifys-latest-web-api/19914)

### Fan‑side analytics

With fan OAuth:

**Top items**

```http
GET https://api.spotify.com/v1/me/top/artists?time_range=medium_term
Authorization: Bearer {FAN_ACCESS_TOKEN}
```

**Library/follows**

```http
GET https://api.spotify.com/v1/me/tracks
GET https://api.spotify.com/v1/me/albums
GET https://api.spotify.com/v1/me/following?type=artist
Authorization: Bearer {FAN_ACCESS_TOKEN}
```

**What you can build**

- Taste profiles for fans; cross‑recommendations for creators (“Your fans also like…”)  
- But not true streaming analytics.

***

## TikTok

Docs: business/research portals (varies). [developers.tiktok](https://developers.tiktok.com/doc/research-api-specs-query-video-comments?enter_method=left_navigation)

### Creator‑side analytics

**Video‑level metrics**

- Via Business/Marketing or Research APIs:
  - likes, comments, shares, views for owned videos. [business-api.tiktok](https://business-api.tiktok.com/portal/docs)
- Example pattern (pseudo):

```http
POST https://business-api.tiktok.com/open_api/v1.3/video/metrics/
Content-Type: application/json
Authorization: Bearer {CREATOR_ACCESS_TOKEN}

{
  "video_ids": ["{video_id}"],
  "metrics": ["play", "like", "comment", "share"]
}
```

**Account‑level**

- follower count, profile views, etc., where supported.

- DB tables:
  - `tiktok_videos(id, creator_id, posted_at, metrics_jsonb)`  
  - `tiktok_account_daily(creator_id, date, followers, views, likes, comments, shares)`

### Fan‑side analytics

- Generally not available; TikTok doesn’t expose per‑fan behavior for your use.

**Gaps**

- APIs and policies are stricter; be conservative in what you rely on.  
- Much of your TikTok “analytics” will be per‑video aggregates only.

***

## Patreon

Docs (community threads): [patreondevelopers](https://www.patreondevelopers.com/t/api-v2-retrieving-current-users-pledges-in-1-call/2724)

### Creator‑side analytics

**Campaign data**

```http
GET https://www.patreon.com/api/oauth2/v2/campaigns/{campaign_id}
  ?include=memberships,tiers
  &fields[campaign]=created_at,patron_count,pledge_sum
  &fields[membership]=patron_status,currently_entitled_amount_cents,pledge_relationship_start
Authorization: Bearer {CREATOR_ACCESS_TOKEN}
```

- Key metrics:
  - `patron_count`, `pledge_sum`, per‑member pledge amounts and statuses. [patreondevelopers](https://www.patreondevelopers.com/t/simplest-way-to-get-how-much-a-user-is-pledging-to-my-campaign/9372)

- DB tables:
  - `patreon_campaigns(id, creator_id, patron_count, pledge_sum_cents, last_synced_at)`  
  - `patreon_memberships(id, campaign_id, patron_id, status, amount_cents, started_at, last_charge_at)`

**What you can build**

- Revenue dashboards, churn charts, cohort analyses, tier performance.

### Fan‑side analytics

- For a fan:
  - List of creators they support, how long, how much (optional UI feature).

**Gaps**

- No post‑level engagement analytics.

***

## How to wire this in Node/TypeScript + Postgres (Neon)

### 1. Services per network

- Create per‑network service modules, e.g.:
  - `services/xAnalytics.ts`  
  - `services/instagramAnalytics.ts`  
  - `services/youtubeAnalytics.ts`  
  - etc.
- Each exposes functions like:

```ts
async function syncCreatorAnalyticsX(creatorId: string, accessToken: string): Promise<void> { ... }
async function syncCreatorAnalyticsYoutube(creatorId: string, accessToken: string): Promise<void> { ... }
```

- Use a common interface for content metrics:

```ts
interface ContentMetric {
  platform: 'x' | 'youtube' | 'tiktok' | 'instagram' | ...;
  creatorId: string;
  contentId: string;
  contentType: 'post' | 'video' | 'stream';
  timestamp: Date;
  metrics: Record<string, number>;
}
```

### 2. Storage model in Neon

- Core tables:
  - `creators` (your internal id + platform ids)  
  - `contents` (row per content item per platform)  
  - `content_metrics_daily` (time‑series by content_id, date)  
  - `account_metrics_daily` (per creator+platform, per date)  

- Example schema snippet:

```sql
CREATE TABLE contents (
  id uuid PRIMARY KEY,
  creator_id uuid NOT NULL,
  platform text NOT NULL,
  platform_content_id text NOT NULL,
  content_type text NOT NULL,
  title text,
  published_at timestamptz,
  UNIQUE (platform, platform_content_id)
);

CREATE TABLE content_metrics_daily (
  id uuid PRIMARY KEY,
  content_id uuid REFERENCES contents(id),
  date date NOT NULL,
  metrics jsonb NOT NULL,
  UNIQUE (content_id, date)
);
```

### 3. Analytics UX ideas powered by this

- Cross‑platform **“What worked this week?”** view:
  - For each platform, show top 3 content items by engagement rate (normalized).  
- **Posting recommendations**:
  - Use aggregated metrics to infer “best hour/day per platform”.  
- **Funnel view**:
  - Use X + IG + YouTube metrics to show a path from awareness (views) → engagement (comments/follows) → monetization (Patreon/Twitch subs).

This markdown should give you a solid blueprint for your Node/TS services and Neon schema, while staying aligned with what each network’s APIs actually expose today.