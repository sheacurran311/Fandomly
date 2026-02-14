import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Rocket,
  Info,
  Sparkles,
} from "lucide-react";

interface TaskBuilderBaseProps {
  // Header
  icon: ReactNode;
  title: string;
  description: string;
  category?: string;
  
  // Content
  children: ReactNode;
  
  // Preview
  previewComponent?: ReactNode;
  
  // Program/Campaign selector rendered above the main form
  programSelector?: ReactNode;
  
  // Actions
  onBack?: () => void;
  onSaveDraft?: () => void;
  onPreview?: () => void;
  onPublish?: () => void;
  
  // State
  isDraft?: boolean;
  isValid?: boolean;
  validationErrors?: string[];
  
  // Help
  helpText?: string;
  exampleUse?: string;
}

export default function TaskBuilderBase({
  icon,
  title,
  description,
  category,
  children,
  previewComponent,
  programSelector,
  onBack,
  onSaveDraft,
  onPreview,
  onPublish,
  isDraft = true,
  isValid = false,
  validationErrors = [],
  helpText,
  exampleUse,
}: TaskBuilderBaseProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b border-white/10 bg-brand-dark-purple/50 backdrop-blur-lg sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/20 flex items-center justify-center">
                  {icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-white">{title}</h1>
                    {category && (
                      <Badge variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    )}
                    {isDraft && (
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                        Draft
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{description}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onSaveDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSaveDraft}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
              )}
              
              {onPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPreview}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              )}
              
              {onPublish && (
                <Button
                  size="sm"
                  onClick={onPublish}
                  disabled={!isValid}
                  className="bg-brand-primary hover:bg-brand-primary/90 text-white"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Publish Task
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 py-6">
        {/* Program/Campaign Selector */}
        {programSelector && (
          <div className="mb-6">
            {programSelector}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">Please fix these issues:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Help Text */}
            {helpText && (
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-gray-300">
                  {helpText}
                </AlertDescription>
              </Alert>
            )}

            {/* Main Configuration */}
            {children}

            {/* Example Use Case */}
            {exampleUse && (
              <Card className="bg-purple-500/5 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Example Use Case
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300">{exampleUse}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Preview & Help */}
          <div className="lg:sticky lg:top-20 space-y-6 self-start">
            {/* Live Preview */}
            {previewComponent && (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </CardTitle>
                  <CardDescription>
                    How fans will see this task
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {previewComponent}
                </CardContent>
              </Card>
            )}

            {/* Quick Tips */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-300">
                <div>
                  <div className="font-semibold text-white mb-1">💡 Best Practices</div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Set realistic reward amounts</li>
                    <li>Test tasks before publishing</li>
                    <li>Add clear descriptions</li>
                    <li>Monitor completion rates</li>
                  </ul>
                </div>
                <Separator className="bg-white/10" />
                <div>
                  <div className="font-semibold text-white mb-1">⚡ Pro Tips</div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Start with small rewards</li>
                    <li>Increase difficulty gradually</li>
                    <li>Link tasks to campaigns</li>
                    <li>Use time limits strategically</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-sm">Task Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Configuration</span>
                  <Badge variant={isValid ? "default" : "outline"} className={
                    isValid 
                      ? "bg-green-500/20 text-green-400 border-green-400"
                      : "text-yellow-400 border-yellow-400"
                  }>
                    {isValid ? "Complete" : "In Progress"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Status</span>
                  <Badge variant="outline" className={
                    isDraft 
                      ? "text-yellow-400 border-yellow-400"
                      : "bg-green-500/20 text-green-400 border-green-400"
                  }>
                    {isDraft ? "Draft" : "Published"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

