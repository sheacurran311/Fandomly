import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Calendar, 
  DollarSign,
  School,
  Gavel,
  BookOpen,
  ExternalLink,
  Download
} from "lucide-react";

interface ComplianceItem {
  id: string;
  category: "state" | "ncaa" | "school" | "tax";
  title: string;
  description: string;
  status: "compliant" | "warning" | "violation" | "pending";
  requirement: string;
  deadline?: string;
  action?: string;
  resources?: string[];
}

interface StateRegulation {
  state: string;
  nilLegalized: boolean;
  keyRequirements: string[];
  disclosureRequired: boolean;
  schoolApprovalRequired: boolean;
  conflictingDealsProhibited: boolean;
}

export default function ComplianceChecker() {
  const [selectedState, setSelectedState] = useState("california");
  const [activeTab, setActiveTab] = useState("status");

  const complianceItems: ComplianceItem[] = [
    {
      id: "1",
      category: "ncaa",
      title: "NIL Deal Disclosure",
      description: "All NIL activities must be disclosed to your school's compliance office",
      status: "compliant",
      requirement: "Report within 72 hours of agreement",
      action: "Automatically reported through Fandomly platform"
    },
    {
      id: "2", 
      category: "state",
      title: "California NIL Law Compliance",
      description: "Must comply with California SB 206 Fair Pay to Play Act",
      status: "compliant",
      requirement: "No conflicting deals with school partnerships",
      action: "Verified through automated checking"
    },
    {
      id: "3",
      category: "school",
      title: "University Policy Approval", 
      description: "School-specific NIL policies must be followed",
      status: "warning",
      requirement: "Obtain approval for certain deal types",
      deadline: "Before deal execution",
      action: "Submit through compliance portal"
    },
    {
      id: "4",
      category: "tax",
      title: "Tax Documentation",
      description: "Proper tax documentation for NIL earnings",
      status: "pending",
      requirement: "1099 forms for earnings over $600",
      deadline: "January 31, 2024",
      action: "Download tax forms from dashboard"
    }
  ];

  const stateRegulations: Record<string, StateRegulation> = {
    california: {
      state: "California",
      nilLegalized: true,
      keyRequirements: [
        "No conflicts with existing school sponsorships",
        "Cannot use school logos/trademarks without permission", 
        "Must disclose NIL activities to school",
        "Cannot receive compensation for recruiting"
      ],
      disclosureRequired: true,
      schoolApprovalRequired: false,
      conflictingDealsProhibited: true
    },
    texas: {
      state: "Texas",
      nilLegalized: true,
      keyRequirements: [
        "Must disclose to institution within 7 days",
        "Cannot use institutional marks",
        "No inducements for enrollment",
        "Must comply with school policies"
      ],
      disclosureRequired: true,
      schoolApprovalRequired: true,
      conflictingDealsProhibited: true
    },
    florida: {
      state: "Florida",
      nilLegalized: true,
      keyRequirements: [
        "Disclosure required within 30 days",
        "Cannot conflict with existing sponsorships",
        "Must be consistent with school values",
        "Professional representation allowed"
      ],
      disclosureRequired: true,
      schoolApprovalRequired: false,
      conflictingDealsProhibited: true
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "violation":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "pending":
        return <Calendar className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "warning":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "violation":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "pending":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const overallStatus = complianceItems.some(item => item.status === "violation") ? "violation" :
                      complianceItems.some(item => item.status === "warning") ? "warning" :
                      complianceItems.some(item => item.status === "pending") ? "pending" : "compliant";

  return (
    <section className="py-16 bg-gradient-to-b from-brand-dark-purple/20 to-brand-dark-bg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 gradient-text">
            NIL Compliance Center
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Stay compliant with NCAA, state, and institutional NIL regulations. Automated monitoring and guidance to protect your eligibility.
          </p>
        </div>

        {/* Overall Status */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 mb-8 max-w-4xl mx-auto">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Shield className="h-8 w-8 text-brand-primary" />
                <div>
                  <h3 className="text-xl font-bold text-white">Compliance Status</h3>
                  <p className="text-gray-300">Overall NIL compliance monitoring</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusIcon(overallStatus)}
                <Badge className={getStatusColor(overallStatus)}>
                  {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-7xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10">
            <TabsTrigger value="status" className="data-[state=active]:bg-brand-primary">Status</TabsTrigger>
            <TabsTrigger value="regulations" className="data-[state=active]:bg-brand-primary">State Laws</TabsTrigger>
            <TabsTrigger value="resources" className="data-[state=active]:bg-brand-primary">Resources</TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-brand-primary">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-8">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Compliance Items */}
              <div className="space-y-4">
                {complianceItems.map((item) => (
                  <Card key={item.id} className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {item.category === "ncaa" && <Gavel className="h-5 w-5 text-blue-400" />}
                          {item.category === "state" && <FileText className="h-5 w-5 text-green-400" />}
                          {item.category === "school" && <School className="h-5 w-5 text-purple-400" />}
                          {item.category === "tax" && <DollarSign className="h-5 w-5 text-yellow-400" />}
                          <span className="text-white">{item.title}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(item.status)}
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300 mb-3">{item.description}</p>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-400">Requirement: </span>
                          <span className="text-white">{item.requirement}</span>
                        </div>
                        {item.deadline && (
                          <div className="text-sm">
                            <span className="text-gray-400">Deadline: </span>
                            <span className="text-yellow-400">{item.deadline}</span>
                          </div>
                        )}
                        {item.action && (
                          <div className="text-sm">
                            <span className="text-gray-400">Action: </span>
                            <span className="text-brand-secondary">{item.action}</span>
                          </div>
                        )}
                      </div>
                      {item.status === "pending" && (
                        <Button className="w-full mt-4 bg-brand-primary hover:bg-brand-primary/80">
                          Take Action
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="space-y-6">
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full bg-brand-primary hover:bg-brand-primary/80 justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Download Tax Forms
                    </Button>
                    <Button variant="outline" className="w-full border-white/20 text-gray-300 justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Compliance Report
                    </Button>
                    <Button variant="outline" className="w-full border-white/20 text-gray-300 justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Compliance Review
                    </Button>
                    <Button variant="outline" className="w-full border-white/20 text-gray-300 justify-start">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Contact Compliance Officer
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Upcoming Deadlines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div>
                          <p className="font-medium text-white">Tax Form Submission</p>
                          <p className="text-sm text-gray-400">Annual 1099 documentation</p>
                        </div>
                        <Badge className="bg-yellow-500/20 text-yellow-400">
                          15 days
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div>
                          <p className="font-medium text-white">Quarterly Review</p>
                          <p className="text-sm text-gray-400">Compliance status check</p>
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-400">
                          30 days
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="regulations" className="mt-8">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white">State NIL Regulations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  {Object.entries(stateRegulations).map(([key, state]) => (
                    <Button
                      key={key}
                      variant={selectedState === key ? "default" : "outline"}
                      className={selectedState === key ? "bg-brand-primary" : "border-white/20 text-gray-300"}
                      onClick={() => setSelectedState(key)}
                    >
                      {state.state}
                    </Button>
                  ))}
                </div>

                {selectedState && (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="bg-white/5 rounded-lg p-4">
                        <h4 className="font-semibold text-white mb-2">NIL Status</h4>
                        <Badge className={stateRegulations[selectedState].nilLegalized ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                          {stateRegulations[selectedState].nilLegalized ? "Legal" : "Restricted"}
                        </Badge>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <h4 className="font-semibold text-white mb-2">Disclosure Required</h4>
                        <Badge className={stateRegulations[selectedState].disclosureRequired ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400"}>
                          {stateRegulations[selectedState].disclosureRequired ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <h4 className="font-semibold text-white mb-2">School Approval</h4>
                        <Badge className={stateRegulations[selectedState].schoolApprovalRequired ? "bg-orange-500/20 text-orange-400" : "bg-gray-500/20 text-gray-400"}>
                          {stateRegulations[selectedState].schoolApprovalRequired ? "Required" : "Not Required"}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white mb-4">Key Requirements</h4>
                      <div className="space-y-2">
                        {stateRegulations[selectedState].keyRequirements.map((req, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">{req}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="mt-8">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-brand-primary" />
                    Educational Resources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h4 className="font-medium text-white mb-2">NIL Basics Guide</h4>
                    <p className="text-gray-400 text-sm mb-3">Complete guide to understanding NIL regulations</p>
                    <Button variant="outline" size="sm" className="border-white/20 text-gray-300">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Read Guide
                    </Button>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h4 className="font-medium text-white mb-2">Tax Implications</h4>
                    <p className="text-gray-400 text-sm mb-3">Understanding tax responsibilities for NIL earnings</p>
                    <Button variant="outline" size="sm" className="border-white/20 text-gray-300">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Legal Support</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-gray-300">
                      This information is for educational purposes only and does not constitute legal advice.
                    </AlertDescription>
                  </Alert>
                  <Button className="w-full bg-brand-primary hover:bg-brand-primary/80">
                    Contact Legal Expert
                  </Button>
                  <Button variant="outline" className="w-full border-white/20 text-gray-300">
                    Schedule Consultation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="mt-8">
            <div className="space-y-4">
              <Alert className="border-yellow-500/20 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-gray-300">
                  <strong className="text-white">Reminder:</strong> Tax documentation deadline approaching in 15 days. Ensure all NIL earnings are properly documented.
                </AlertDescription>
              </Alert>
              <Alert className="border-blue-500/20 bg-blue-500/10">
                <Calendar className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-gray-300">
                  <strong className="text-white">Upcoming:</strong> Quarterly compliance review scheduled for next month. Review all recent NIL activities.
                </AlertDescription>
              </Alert>
              <Alert className="border-green-500/20 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-gray-300">
                  <strong className="text-white">Success:</strong> All current NIL deals have been automatically verified for compliance.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}