'use client';

/**
 * Client Detail Page Client Component
 *
 * Displays client information with tabs for overview, activity, documents, etc.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, Mail, Phone, Globe, MapPin, Plus, FileText, DollarSign, ClipboardCheck, FolderOpen, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { strings } from '@/config';
import type { ClientDetail } from '@/lib/services/clients';
import { ClientStatus, AssessmentStatus, AssessmentType, InstallationStatus } from '@/lib/types/firestore';
import { formatDate } from '@/lib/utils';

interface ClientDetailPageClientProps {
  client: ClientDetail;
}

const statusColors: Record<ClientStatus, 'default' | 'secondary' | 'outline'> = {
  [ClientStatus.ACTIVE]: 'default',
  [ClientStatus.PROSPECT]: 'secondary',
  [ClientStatus.INACTIVE]: 'outline',
};

export function ClientDetailPageClient({ client }: ClientDetailPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Fetch assessments when assessments tab is active
  useEffect(() => {
    if (activeTab === 'assessments' && assessments.length === 0 && !isLoadingAssessments) {
      setIsLoadingAssessments(true);
      fetch(`/api/assessments?clientId=${client.id}&limit=20`)
        .then((res) => res.json())
        .then((data) => {
          setAssessments(data.assessments || []);
        })
        .catch(console.error)
        .finally(() => setIsLoadingAssessments(false));
    }
  }, [activeTab, client.id, assessments.length, isLoadingAssessments]);

  // Fetch documents when documents tab is active
  useEffect(() => {
    if (activeTab === 'documents' && documents.length === 0 && !isLoadingDocuments) {
      setIsLoadingDocuments(true);
      fetch(`/api/documents?clientId=${client.id}&limit=20`)
        .then((res) => res.json())
        .then((data) => {
          setDocuments(data.documents || []);
        })
        .catch(console.error)
        .finally(() => setIsLoadingDocuments(false));
    }
  }, [activeTab, client.id, documents.length, isLoadingDocuments]);

  // Fetch projects when projects tab is active
  useEffect(() => {
    if (activeTab === 'projects' && projects.length === 0 && !isLoadingProjects) {
      setIsLoadingProjects(true);
      // Query projects collection directly
      fetch(`/api/projects?clientId=${client.id}&limit=20`)
        .then((res) => res.json())
        .then((data) => {
          setProjects(data.projects || []);
        })
        .catch(() => {
          // If projects API doesn't exist, fetch from Firestore directly via a service
          setProjects([]);
        })
        .finally(() => setIsLoadingProjects(false));
    }
  }, [activeTab, client.id, projects.length, isLoadingProjects]);

  // Fetch activities when activity tab is active
  useEffect(() => {
    if (activeTab === 'activity' && activities.length === 0 && !isLoadingActivities) {
      setIsLoadingActivities(true);
      fetch(`/api/activities?clientId=${client.id}&limit=50`)
        .then((res) => res.json())
        .then((data) => {
          setActivities(data.activities || []);
        })
        .catch(console.error)
        .finally(() => setIsLoadingActivities(false));
    }
  }, [activeTab, client.id, activities.length, isLoadingActivities]);

  // Fetch invoices when financial tab is active
  useEffect(() => {
    if (activeTab === 'financial' && invoices.length === 0 && !isLoadingInvoices) {
      setIsLoadingInvoices(true);
      fetch(`/api/invoices?clientId=${client.id}&limit=20`)
        .then((res) => res.json())
        .then((data) => {
          setInvoices(data.invoices || []);
        })
        .catch(console.error)
        .finally(() => setIsLoadingInvoices(false));
    }
  }, [activeTab, client.id, invoices.length, isLoadingInvoices]);

  const typeLabels: Record<AssessmentType, string> = {
    WORKSPACE: 'Workspace',
    ERGONOMIC: 'Ergonomic',
    LIGHTING: 'Lighting',
    AIR_QUALITY: 'Air Quality',
    COMPREHENSIVE: 'Comprehensive',
  };

  const statusLabels: Record<AssessmentStatus, string> = {
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    REPORT_GENERATED: 'Report Generated',
    CANCELLED: 'Cancelled',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{client.companyName}</h1>
            <Badge variant={statusColors[client.status]}>
              {client.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {client.industry || 'No industry specified'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/clients/${client.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            {strings.actions.edit}
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{strings.clientTabs.overview}</TabsTrigger>
          <TabsTrigger value="activity">{strings.clientTabs.activity}</TabsTrigger>
          <TabsTrigger value="documents">{strings.clientTabs.documents}</TabsTrigger>
          <TabsTrigger value="financial">{strings.clientTabs.financial}</TabsTrigger>
          <TabsTrigger value="assessments">{strings.clientTabs.assessments}</TabsTrigger>
          <TabsTrigger value="projects">{strings.clientTabs.projects}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="font-medium">{client.companyName}</p>
                </div>
                {client.industry && (
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{client.industry}</p>
                  </div>
                )}
                {client.website && (
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3" />
                      {client.website}
                    </a>
                  </div>
                )}
                {client.budgetRange && (
                  <div>
                    <p className="text-sm text-muted-foreground">Budget Range</p>
                    <p className="font-medium">{client.budgetRange.replace('_', ' ')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Address Information */}
            {(client.address || client.city || client.state || client.country) && (
              <Card>
                <CardHeader>
                  <CardTitle>Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      {client.address && <p>{client.address}</p>}
                      {(client.city || client.state || client.postalCode) && (
                        <p>
                          {[client.city, client.state, client.postalCode].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {client.country && <p>{client.country}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contacts */}
            {client.contacts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {client.contacts.map((contact) => (
                      <div key={contact.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{contact.name}</p>
                          {contact.isPrimary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>
                        {contact.jobTitle && (
                          <p className="text-sm text-muted-foreground">{contact.jobTitle}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </a>
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Scope */}
            {client.initialScope && (
              <Card>
                <CardHeader>
                  <CardTitle>Initial Project Scope</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{client.initialScope}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {client.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            <p>Created: {formatDate(client.createdAt)}</p>
            <p>Last updated: {formatDate(client.updatedAt)}</p>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>{strings.clientTabs.activity}</CardTitle>
              <CardDescription>Recent activity and interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingActivities ? (
                <div className="text-center py-8 text-muted-foreground">Loading activities...</div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{activity.description || activity.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.createdAt ? formatDate(activity.createdAt) : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{strings.clientTabs.documents}</CardTitle>
                  <CardDescription>Client documents and files</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (
                <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name || 'Unnamed Document'}</TableCell>
                        <TableCell>{doc.category || '—'}</TableCell>
                        <TableCell>{doc.uploadedAt ? formatDate(doc.uploadedAt) : '—'}</TableCell>
                        <TableCell className="text-right">
                          {doc.url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                View
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{strings.clientTabs.financial}</CardTitle>
                  <CardDescription>Invoices and payments</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingInvoices ? (
                <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No invoices found</p>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber || invoice.id}</TableCell>
                        <TableCell>${invoice.amount?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === 'PAID' ? 'default' : 'outline'}>
                            {invoice.status || 'PENDING'}
                          </Badge>
                        </TableCell>
                        <TableCell>{invoice.createdAt ? formatDate(invoice.createdAt) : '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{strings.clientTabs.assessments}</CardTitle>
                  <CardDescription>Workspace assessments</CardDescription>
                </div>
                <Button size="sm" asChild>
                  <Link href={`/assessments/new?clientId=${client.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assessment
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAssessments ? (
                <div className="text-center py-8 text-muted-foreground">Loading assessments...</div>
              ) : assessments.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No assessments found</p>
                  <Button size="sm" asChild>
                    <Link href={`/assessments/new?clientId=${client.id}`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Assessment
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Conducted Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessments.map((assessment) => (
                      <TableRow key={assessment.id}>
                        <TableCell>{typeLabels[assessment.type] || assessment.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {statusLabels[assessment.status] || assessment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {assessment.conductedDate ? formatDate(assessment.conductedDate) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/assessments/${assessment.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{strings.clientTabs.projects}</CardTitle>
                  <CardDescription>Client projects</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingProjects ? (
                <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No projects found</p>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.name || 'Unnamed Project'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{project.status || 'PLANNING'}</Badge>
                        </TableCell>
                        <TableCell>
                          {project.createdAt ? formatDate(project.createdAt) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
