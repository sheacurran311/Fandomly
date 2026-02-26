import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Circle, 
  AlertCircle, 
  Rocket,
  ArrowRight,
  ExternalLink,
  CheckCircle2
} from "lucide-react";

interface ProgramBuilderProgressProps {
  program: {
    id: number;
    name: string;
    status: string;
    slug?: string | null;
  } | null;
  setupProgress: number; // 0-100
  isLoading?: boolean;
}

export function ProgramBuilderProgress({
  program,
  setupProgress,
  isLoading = false
}: ProgramBuilderProgressProps) {
  const isPublished = program?.status === 'published';
  const hasProgram = !!program;
  
  // Determine state
  type ProgramState = 'not_started' | 'in_progress' | 'published';
  const state: ProgramState = !hasProgram ? 'not_started' : isPublished ? 'published' : 'in_progress';
  
  // Configuration for each state
  const stateConfig = {
    not_started: {
      icon: Circle,
      iconColor: 'text-gray-400',
      label: 'Program Not Started',
      badgeVariant: 'secondary' as const,
      badgeText: '0%',
      progress: 0,
      gradientFrom: 'from-gray-500/10',
      gradientTo: 'to-gray-500/10',
      borderColor: 'border-gray-500/20',
      buttonText: 'Start Building',
      buttonLink: '/creator-dashboard/program-builder',
    },
    in_progress: {
      icon: AlertCircle,
      iconColor: 'text-yellow-500',
      label: 'Program In Progress',
      badgeVariant: 'secondary' as const,
      badgeText: `${setupProgress}%`,
      progress: setupProgress,
      gradientFrom: 'from-yellow-500/10',
      gradientTo: 'to-orange-500/10',
      borderColor: 'border-yellow-500/20',
      buttonText: 'Continue Building',
      buttonLink: '/creator-dashboard/program-builder',
    },
    published: {
      icon: Rocket,
      iconColor: 'text-green-500',
      label: 'Program Live',
      badgeVariant: 'default' as const,
      badgeText: '100%',
      progress: 100,
      gradientFrom: 'from-green-500/10',
      gradientTo: 'to-emerald-500/10',
      borderColor: 'border-green-500/20',
      buttonText: 'View Program',
      buttonLink: program?.slug ? `/programs/${program.slug}` : '/creator-dashboard/program-builder',
    },
  };
  
  const config = stateConfig[state];
  const IconComponent = config.icon;
  
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/10 border-gray-500/20">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 bg-white/10 rounded w-32" />
              <div className="h-5 bg-white/10 rounded w-12" />
            </div>
            <div className="h-2 bg-white/10 rounded w-full mb-3" />
            <div className="h-8 bg-white/10 rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} ${config.borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
            <span className="font-semibold text-white">
              {config.label}
            </span>
          </div>
          <Badge variant={config.badgeVariant} className="text-xs">
            {config.badgeText}
          </Badge>
        </div>
        
        <Progress value={config.progress} className="h-2 mb-3" />
        
        {state === 'not_started' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              Create your fan program to start engaging with your audience
            </p>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => window.location.href = config.buttonLink}
            >
              {config.buttonText} <ArrowRight className="h-3 w-3 ml-2" />
            </Button>
          </div>
        )}
        
        {state === 'in_progress' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              {program?.name ? `"${program.name}" - ` : ''}Complete setup to publish
            </p>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => window.location.href = config.buttonLink}
            >
              {config.buttonText} <ArrowRight className="h-3 w-3 ml-2" />
            </Button>
          </div>
        )}
        
        {state === 'published' && (
          <div className="space-y-2">
            <p className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {program?.name || 'Your program'} is live
            </p>
            <Button 
              size="sm" 
              variant="outline"
              className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={() => window.open(config.buttonLink, '_blank')}
            >
              {config.buttonText} <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
