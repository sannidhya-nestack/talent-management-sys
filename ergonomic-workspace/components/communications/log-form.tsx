'use client';

/**
 * Communication Log Form Component
 *
 * Form for logging communications with action items and attachment support.
 */

import * as React from 'react';
import { Plus, X, Upload, FileText, Calendar, Clock, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CommunicationType } from '@/lib/types/firestore';
import type { ActionItem } from '@/lib/services/communications';

export interface CommunicationFormData {
  type: CommunicationType;
  subject?: string;
  participants?: string[];
  notes?: string;
  date: Date;
  duration?: number;
  attachments?: string[];
  actionItems?: Omit<ActionItem, 'id'>[];
}

interface CommunicationLogFormProps {
  clientId: string;
  clientContacts?: Array<{ id: string; name: string; email: string }>;
  onSubmit: (data: CommunicationFormData) => Promise<void>;
  onCancel?: () => void;
}

export function CommunicationLogForm({
  clientId,
  clientContacts = [],
  onSubmit,
  onCancel,
}: CommunicationLogFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [type, setType] = React.useState<CommunicationType>(CommunicationType.CALL);
  const [subject, setSubject] = React.useState('');
  const [participants, setParticipants] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState('');
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 16));
  const [duration, setDuration] = React.useState('');
  const [attachments, setAttachments] = React.useState<string[]>([]);
  const [actionItems, setActionItems] = React.useState<Omit<ActionItem, 'id'>[]>([]);
  const [newActionItem, setNewActionItem] = React.useState({
    description: '',
    assignedTo: '',
    dueDate: '',
    status: 'PENDING' as const,
  });

  const handleAddActionItem = () => {
    if (!newActionItem.description.trim()) {
      toast({
        title: 'Error',
        description: 'Action item description is required',
        variant: 'destructive',
      });
      return;
    }

    setActionItems([
      ...actionItems,
      {
        description: newActionItem.description,
        assignedTo: newActionItem.assignedTo || null,
        dueDate: newActionItem.dueDate ? new Date(newActionItem.dueDate) : null,
        status: newActionItem.status,
        completedAt: null,
        completedBy: null,
      },
    ]);

    setNewActionItem({
      description: '',
      assignedTo: '',
      dueDate: '',
      status: 'PENDING',
    });
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const handleAddParticipant = (contactId: string) => {
    if (!participants.includes(contactId)) {
      setParticipants([...participants, contactId]);
    }
  };

  const handleRemoveParticipant = (contactId: string) => {
    setParticipants(participants.filter((id) => id !== contactId));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // TODO: Implement actual file upload to storage
    // For now, just store file names
    const fileNames = Array.from(files).map((file) => file.name);
    setAttachments([...attachments, ...fileNames]);

    toast({
      title: 'Files added',
      description: `${fileNames.length} file(s) added`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        type,
        subject: subject || undefined,
        participants: participants.length > 0 ? participants : undefined,
        notes: notes || undefined,
        date: new Date(date),
        duration: duration ? parseInt(duration, 10) : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        actionItems: actionItems.length > 0 ? actionItems : undefined,
      });

      toast({
        title: 'Success',
        description: 'Communication logged successfully',
      });

      // Reset form
      setType(CommunicationType.CALL);
      setSubject('');
      setParticipants([]);
      setNotes('');
      setDate(new Date().toISOString().slice(0, 16));
      setDuration('');
      setAttachments([]);
      setActionItems([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to log communication',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Log Communication</CardTitle>
          <CardDescription>Record a communication with the client</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Type */}
          <div className="space-y-2">
            <Label>Communication Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as CommunicationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CommunicationType.CALL}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Call
                  </div>
                </SelectItem>
                <SelectItem value={CommunicationType.EMAIL}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value={CommunicationType.MEETING}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Meeting
                  </div>
                </SelectItem>
                <SelectItem value={CommunicationType.NOTE}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Note
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            {type === CommunicationType.CALL || type === CommunicationType.MEETING ? (
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                />
              </div>
            ) : null}
          </div>

          {/* Subject */}
          {(type === CommunicationType.EMAIL || type === CommunicationType.MEETING) && (
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Meeting subject or email subject"
              />
            </div>
          )}

          {/* Participants */}
          {(type === CommunicationType.MEETING || type === CommunicationType.CALL) && (
            <div className="space-y-2">
              <Label>Participants</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {participants.map((contactId) => {
                  const contact = clientContacts.find((c) => c.id === contactId);
                  return contact ? (
                    <Badge key={contactId} variant="secondary" className="flex items-center gap-1">
                      {contact.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(contactId)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
              {clientContacts.length > 0 && (
                <Select
                  value=""
                  onValueChange={(value) => {
                    handleAddParticipant(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add participant" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientContacts
                      .filter((c) => !participants.includes(c.id))
                      .map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} ({contact.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this communication..."
              rows={6}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((file, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {file}
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          </div>

          {/* Action Items */}
          <div className="space-y-2">
            <Label>Action Items</Label>
            {actionItems.length > 0 && (
              <div className="space-y-2 mb-2">
                {actionItems.map((item, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.description}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {item.assignedTo && <span>Assigned to: {item.assignedTo}</span>}
                          {item.dueDate && (
                            <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                          )}
                          <Badge variant="outline">{item.status}</Badge>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveActionItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            <Card className="p-3 border-dashed">
              <div className="space-y-3">
                <Input
                  placeholder="Action item description"
                  value={newActionItem.description}
                  onChange={(e) =>
                    setNewActionItem({ ...newActionItem, description: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Assigned to (optional)"
                    value={newActionItem.assignedTo}
                    onChange={(e) =>
                      setNewActionItem({ ...newActionItem, assignedTo: e.target.value })
                    }
                  />
                  <Input
                    type="date"
                    placeholder="Due date (optional)"
                    value={newActionItem.dueDate}
                    onChange={(e) =>
                      setNewActionItem({ ...newActionItem, dueDate: e.target.value })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddActionItem}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action Item
                </Button>
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging...' : 'Log Communication'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
