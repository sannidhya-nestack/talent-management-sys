'use client';

/**
 * Proposal Viewer Component
 *
 * Displays generated proposals with sections, pricing, and timeline.
 */

import * as React from 'react';
import { Download, FileText, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { Proposal } from '@/lib/services/proposals';

export interface ProposalViewerProps {
  proposal: Proposal;
  onExport?: (format: 'pdf' | 'word') => void;
  onSend?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function ProposalViewer({
  proposal,
  onExport,
  onSend,
  onApprove,
  onReject,
}: ProposalViewerProps) {
  const { toast } = useToast();

  const handleExport = (format: 'pdf' | 'word') => {
    if (onExport) {
      onExport(format);
    } else {
      toast({
        title: 'Export',
        description: `Exporting as ${format.toUpperCase()}...`,
      });
    }
  };

  const handleSend = () => {
    if (onSend) {
      onSend();
    } else {
      toast({
        title: 'Send Proposal',
        description: 'Sending proposal to client...',
      });
    }
  };

  const statusBadge = {
    DRAFT: <Badge variant="outline">Draft</Badge>,
    SENT: <Badge variant="default">Sent</Badge>,
    APPROVED: (
      <Badge variant="default" className="bg-green-600">
        <CheckCircle className="h-3 w-3 mr-1" />
        Approved
      </Badge>
    ),
    REJECTED: (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Rejected
      </Badge>
    ),
    REVISED: (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Revised
      </Badge>
    ),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Proposal</h2>
          <p className="text-muted-foreground">Version {proposal.version}</p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge[proposal.status]}
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('word')}>
            <FileText className="h-4 w-4 mr-2" />
            Export Word
          </Button>
          {proposal.status === 'DRAFT' && (
            <Button onClick={handleSend}>
              <Send className="h-4 w-4 mr-2" />
              Send to Client
            </Button>
          )}
        </div>
      </div>

      {/* Proposal Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {proposal.sections
            .sort((a, b) => a.order - b.order)
            .map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none whitespace-pre-wrap">{section.content}</div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Specifications</CardTitle>
              <CardDescription>Detailed specifications for all products included in this proposal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proposal.products.map((product, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{product.productName}</h4>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${product.unitPrice.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Qty: {product.quantity}</p>
                      </div>
                    </div>
                    {product.specifications && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Specifications:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(product.specifications).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-muted-foreground">{key}:</span>{' '}
                              <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Itemized Products */}
                <div className="space-y-2">
                  {proposal.products.map((product, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {product.productName} x {product.quantity}
                      </span>
                      <span className="font-medium">${product.totalPrice.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium">${proposal.pricing.subtotal.toLocaleString()}</span>
                  </div>
                  {proposal.pricing.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-${proposal.pricing.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax ({((proposal.pricing.tax / proposal.pricing.subtotal) * 100).toFixed(1)}%)</span>
                    <span className="font-medium">${proposal.pricing.tax.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${proposal.pricing.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Installation Timeline</CardTitle>
              <CardDescription>Total Duration: {proposal.timeline.totalDuration}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proposal.timeline.phases.map((phase, index) => (
                  <div key={index} className="border-l-2 border-primary pl-4 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold">{phase.name}</h4>
                      <Badge variant="outline">{phase.duration}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{phase.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Terms Tab */}
        <TabsContent value="terms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none whitespace-pre-wrap">{proposal.termsAndConditions}</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
