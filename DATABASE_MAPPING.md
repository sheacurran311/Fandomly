# Fandomly Database Field Mapping

## Frontend Form Data → Database Structure

### 1. User Registration & Basic Info
```
Frontend Form Field → Database Table.Column
─────────────────────────────────────────
dynamicUserId → users.dynamic_user_id
email → users.email  
userType ("creator") → users.user_type
```

### 2. Creator Profile Data
```
Frontend Form Field → Database Table.Column
─────────────────────────────────────────
displayName → creators.display_name
bio → creators.bio
followerCount → creators.follower_count
creatorType → creators.category
```

### 3. Creator Type-Specific Data (JSONB)
All stored in `creators.type_specific_data` JSONB field:

#### Athlete Data (`creatorType = "athlete"`)
```
Frontend Field → JSONB Path
──────────────────────────
sport → type_specific_data.athlete.sport
ageRange → type_specific_data.athlete.ageRange
education → type_specific_data.athlete.education
position → type_specific_data.athlete.position
school → type_specific_data.athlete.school
currentSponsors → type_specific_data.athlete.currentSponsors (array)
nilCompliant → type_specific_data.athlete.nilCompliant (boolean)
```

#### Musician Data (`creatorType = "musician"`)
```
Frontend Field → JSONB Path
──────────────────────────
bandArtistName → type_specific_data.musician.bandArtistName
musicCatalogUrl → type_specific_data.musician.musicCatalogUrl
artistType → type_specific_data.musician.artistType
musicGenre → type_specific_data.musician.musicGenre (array)
```

#### Content Creator Data (`creatorType = "content_creator"`)
```
Frontend Field → JSONB Path
──────────────────────────
contentType → type_specific_data.contentCreator.contentType (array)
topicsOfFocus → type_specific_data.contentCreator.topicsOfFocus (array)
sponsorships → type_specific_data.contentCreator.sponsorships (array)
totalViews → type_specific_data.contentCreator.totalViews
platforms → type_specific_data.contentCreator.platforms (array)
```

### 4. Store/Tenant Information
```
Frontend Form Field → Database Table.Column
─────────────────────────────────────────
name → tenants.name
slug → tenants.slug
subscriptionTier → tenants.subscription_tier
primaryColor → tenants.branding.primaryColor
secondaryColor → tenants.branding.secondaryColor
accentColor → tenants.branding.accentColor
```

### 5. Social Media Links
```
Frontend Form Field → Database Table.Column
─────────────────────────────────────────
instagram → creators.social_links.instagram
twitter → creators.social_links.twitter
tiktok → creators.social_links.tiktok
```

### 6. Business Information (Tenant)
```
Frontend Form Field → Database Table.Column
─────────────────────────────────────────
creatorType → tenants.business_info.businessType
instagram → tenants.business_info.socialLinks.instagram
twitter → tenants.business_info.socialLinks.twitter
tiktok → tenants.business_info.socialLinks.tiktok
```

### 7. Billing/Stripe Integration
```
Frontend Form Field → Database Table.Column
─────────────────────────────────────────
subscriptionTier → tenants.subscription_tier
(stripe customer ID) → tenants.billing_info.stripeCustomerId
(stripe subscription ID) → tenants.billing_info.subscriptionId
```

### 8. Onboarding State
```
Frontend Form Field → Database Table.Column
─────────────────────────────────────────
(completion status) → users.onboarding_state.isCompleted
(current step) → users.onboarding_state.currentStep
(completed steps) → users.onboarding_state.completedSteps
```

## Current Database Tables Structure

### users
- Basic user info and authentication
- Links to Dynamic wallet auth
- Onboarding tracking
- Current tenant assignment

### tenants  
- Each creator gets their own tenant (store)
- Branding, billing, settings
- Multi-tenant isolation

### creators
- Creator-specific profile data
- Type-specific data in JSONB field
- Links to user and tenant

### tenant_memberships
- Users can be members of multiple tenants
- Role-based permissions per tenant