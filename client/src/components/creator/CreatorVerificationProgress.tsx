/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  BadgeCheck,
  ArrowRight,
  Sparkles,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  CREATOR_FIELD_INFO,
  CREATOR_VERIFICATION_REQUIREMENTS,
} from '@shared/creatorVerificationSchema';
import type {
  CreatorVerificationData,
  PlatformActivityContext,
} from '@shared/creatorVerificationSchema';

interface CreatorVerificationProgressProps {
  creator: Record<string, unknown>;
  verificationData: CreatorVerificationData;
  platformActivity?: PlatformActivityContext;
  onStartWizard?: () => void;
  showWizardButton?: boolean;
  compact?: boolean;
}

export function CreatorVerificationProgress({
  creator,
  verificationData,
  platformActivity,
  onStartWizard,
  showWizardButton = true,
  compact = false,
}: CreatorVerificationProgressProps) {
  const {
    profileComplete,
    requiredFieldsFilled,
    completionPercentage,
    missingFields,
    verifiedAt,
    verificationMethod,
  } = verificationData;

  const creatorType = creator.category as 'athlete' | 'musician' | 'content_creator';

  // Get field groups
  const basicFields = CREATOR_VERIFICATION_REQUIREMENTS.basic;
  const typeSpecificFields =
    CREATOR_VERIFICATION_REQUIREMENTS[
      creatorType === 'content_creator' ? 'contentCreator' : creatorType
    ];
  const socialFields = CREATOR_VERIFICATION_REQUIREMENTS.socialMedia;

  const isFieldComplete = (field: string) => {
    if (field === 'socialMedia') {
      return socialFields.some((social) => requiredFieldsFilled.includes(social));
    }
    return requiredFieldsFilled.includes(field);
  };

  const getFieldStatus = (field: string): 'complete' | 'incomplete' => {
    return isFieldComplete(field) ? 'complete' : 'incomplete';
  };

  // Verification benefits
  const benefits = [
    { icon: BadgeCheck, text: 'Verified badge on your profile', locked: !profileComplete },
    { icon: Unlock, text: 'Access to advanced analytics', locked: !profileComplete },
    { icon: Sparkles, text: 'Priority in creator discovery', locked: !profileComplete },
    { icon: Unlock, text: 'Unlock all campaign features', locked: !profileComplete },
  ];

  // Compact view for dashboard cards
  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {profileComplete ? (
                <BadgeCheck className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <span className="font-semibold">
                {profileComplete ? 'Profile Verified' : 'Profile Incomplete'}
              </span>
            </div>
            <Badge variant={profileComplete ? 'default' : 'secondary'} className="text-xs">
              {completionPercentage}%
            </Badge>
          </div>

          <Progress value={completionPercentage} className="h-2 mb-3" />

          {!profileComplete && missingFields && missingFields.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                {missingFields.length} field{missingFields.length !== 1 ? 's' : ''} remaining
              </p>
              {showWizardButton && onStartWizard && (
                <Button size="sm" className="w-full" onClick={onStartWizard}>
                  Verify Now <ArrowRight className="h-3 w-3 ml-2" />
                </Button>
              )}
            </div>
          )}

          {profileComplete && verifiedAt && (
            <p className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Verified {verificationMethod === 'auto' ? 'automatically' : 'by admin'}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full view for dedicated verification page
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-full ${profileComplete ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}
            >
              {profileComplete ? (
                <BadgeCheck className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              )}
            </div>
            <div>
              <CardTitle>
                {profileComplete ? 'Creator Verified!' : 'Creator Verification'}
              </CardTitle>
              <CardDescription>
                {profileComplete
                  ? 'Your creator profile is 100% complete and verified'
                  : `${completionPercentage}% complete - ${missingFields?.length || 0} fields remaining`}
              </CardDescription>
            </div>
          </div>

          {profileComplete && (
            <Badge variant="default" className="bg-green-500 text-white">
              <BadgeCheck className="h-3 w-3 mr-1" /> Verified
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Profile Completion</span>
            <span className="font-semibold">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-3" />
        </div>

        {/* Verification Status Alert */}
        {profileComplete ? (
          <Alert className="bg-green-500/10 border-green-500/20">
            <BadgeCheck className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              Congratulations! Your profile is verified. You now have access to all creator features
              and your profile displays a verified badge.
              {verifiedAt && (
                <span className="block mt-1 text-xs">
                  Verified on {new Date(verifiedAt).toLocaleDateString()}
                  {verificationMethod === 'manual' && ' by admin'}
                </span>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-yellow-500/10 border-yellow-500/20">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-400">
              Complete the required fields below to verify your profile and unlock all creator
              features.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Required Fields Checklist */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              Basic Information
              <Badge variant="secondary" className="text-xs">
                {basicFields.filter((f) => isFieldComplete(f)).length}/{basicFields.length}
              </Badge>
            </h4>
            <div className="space-y-2">
              {basicFields.map((field) => {
                const status = getFieldStatus(field);
                const fieldInfo = CREATOR_FIELD_INFO[field];

                return (
                  <div
                    key={field}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:opacity-80
                      ${
                        status === 'complete'
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-red-500/30 bg-red-500/5'
                      }
                    `}
                    onClick={() => onStartWizard?.()}
                  >
                    {status === 'complete' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{fieldInfo?.label || field}</p>
                      <p className="text-xs text-gray-400">{fieldInfo?.description}</p>
                    </div>
                    {status === 'incomplete' && (
                      <Badge variant="outline" className="text-red-400 border-red-400">
                        Required
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Type-Specific Information */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              {creatorType === 'athlete'
                ? 'Athletic'
                : creatorType === 'musician'
                  ? 'Music'
                  : 'Content Creator'}{' '}
              Information
              <Badge variant="secondary" className="text-xs">
                {typeSpecificFields.filter((f) => isFieldComplete(f)).length}/
                {typeSpecificFields.length}
              </Badge>
            </h4>
            <div className="space-y-2">
              {typeSpecificFields.map((field) => {
                const status = getFieldStatus(field);
                const fieldInfo = CREATOR_FIELD_INFO[field];

                return (
                  <div
                    key={field}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:opacity-80
                      ${
                        status === 'complete'
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-red-500/30 bg-red-500/5'
                      }
                    `}
                    onClick={() => onStartWizard?.()}
                  >
                    {status === 'complete' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{fieldInfo?.label || field}</p>
                      <p className="text-xs text-gray-400">{fieldInfo?.description}</p>
                    </div>
                    {status === 'incomplete' && (
                      <Badge variant="outline" className="text-red-400 border-red-400">
                        Required
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              Social Media Connections
              <Badge variant="secondary" className="text-xs">
                At least {CREATOR_VERIFICATION_REQUIREMENTS.minSocialAccounts} required
              </Badge>
            </h4>
            <div className="space-y-2">
              <div
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:opacity-80
                  ${
                    isFieldComplete('socialMedia')
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  }
                `}
                onClick={() => onStartWizard?.()}
              >
                {isFieldComplete('socialMedia') ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    Connect at least {CREATOR_VERIFICATION_REQUIREMENTS.minSocialAccounts} social
                    media accounts
                  </p>
                  <p className="text-xs text-gray-400">
                    {isFieldComplete('socialMedia')
                      ? `Connected: ${socialFields
                          .filter((s) => requiredFieldsFilled.includes(s))
                          .map((s) => CREATOR_FIELD_INFO[s]?.label)
                          .join(', ')}`
                      : 'Instagram, TikTok, Twitter, YouTube, Spotify, Facebook, or Discord'}
                  </p>
                </div>
                {!isFieldComplete('socialMedia') && (
                  <Badge variant="outline" className="text-red-400 border-red-400">
                    Required
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Platform Activity & Verification */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              Verification Requirements
              <Badge variant="secondary" className="text-xs">
                {
                  [
                    isFieldComplete('activeProgram'),
                    isFieldComplete('publishedTask'),
                    isFieldComplete('socialMedia'),
                  ].filter(Boolean).length
                }
                /4
              </Badge>
            </h4>
            <div className="space-y-2">
              {/* Active Program */}
              <div
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${
                    isFieldComplete('activeProgram')
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  }
                `}
              >
                {isFieldComplete('activeProgram') ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{CREATOR_FIELD_INFO.activeProgram?.label}</p>
                  <p className="text-xs text-gray-400">
                    {platformActivity && platformActivity.activeProgramCount > 0
                      ? `${platformActivity.activeProgramCount} active program${platformActivity.activeProgramCount !== 1 ? 's' : ''}`
                      : CREATOR_FIELD_INFO.activeProgram?.description}
                  </p>
                </div>
                {!isFieldComplete('activeProgram') && (
                  <Badge variant="outline" className="text-red-400 border-red-400">
                    Required
                  </Badge>
                )}
              </div>

              {/* Published Task */}
              <div
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${
                    isFieldComplete('publishedTask')
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  }
                `}
              >
                {isFieldComplete('publishedTask') ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{CREATOR_FIELD_INFO.publishedTask?.label}</p>
                  <p className="text-xs text-gray-400">
                    {platformActivity && platformActivity.publishedTaskCount > 0
                      ? `${platformActivity.publishedTaskCount} task${platformActivity.publishedTaskCount !== 1 ? 's' : ''} published`
                      : CREATOR_FIELD_INFO.publishedTask?.description}
                  </p>
                </div>
                {!isFieldComplete('publishedTask') && (
                  <Badge variant="outline" className="text-red-400 border-red-400">
                    Required
                  </Badge>
                )}
              </div>

              {/* Paid Account (placeholder) */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-500/30 bg-gray-500/5 opacity-75">
                <Lock className="h-5 w-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Paid Account</p>
                  <p className="text-xs text-gray-400">
                    Creator verification requires a paid subscription (coming soon)
                  </p>
                </div>
                <Badge variant="outline" className="text-gray-300 border-gray-300">
                  Coming Soon
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Verification Benefits */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Verification Benefits</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${
                    benefit.locked
                      ? 'border-white/10 bg-white/5 opacity-50'
                      : 'border-green-500/30 bg-green-500/5'
                  }
                `}
              >
                <benefit.icon
                  className={`h-5 w-5 ${benefit.locked ? 'text-gray-400' : 'text-green-500'}`}
                />
                <span className="text-sm">{benefit.text}</span>
                {benefit.locked && <Lock className="h-4 w-4 text-gray-400 ml-auto" />}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {!profileComplete && showWizardButton && onStartWizard && (
          <>
            <Separator />
            <div className="flex gap-3">
              <Button onClick={onStartWizard} className="flex-1" size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Complete Verification
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
