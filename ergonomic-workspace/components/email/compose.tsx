'use client';

/**
 * Email Compose Component
 *
 * Rich text email composition interface with template support.
 */

import * as React from 'react';
import { Send, Paperclip, Calendar, X, Loader2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { emailTemplates } from '@/lib/email/templates';

interface EmailComposeProps {
  open: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  clientId?: string;
  onSend?: () => void;
}

export function EmailCompose({
  open,
  onClose,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  clientId,
  onSend,
}: EmailComposeProps) {
  const { toast } = useToast();
  const [to, setTo] = React.useState(defaultTo);
  const [subject, setSubject] = React.useState(defaultSubject);
  const [body, setBody] = React.useState(defaultBody);
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>('');
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [scheduleDate, setScheduleDate] = React.useState<string>('');
  const [scheduleTime, setScheduleTime] = React.useState<string>('');
  const [isSending, setIsSending] = React.useState(false);
  const [senderEmail, setSenderEmail] = React.useState<string>('');
  const [availableSenders, setAvailableSenders] = React.useState<Array<{ email: string; provider: string }>>([]);

  // Load available email accounts
  React.useEffect(() => {
    if (open) {
      fetch('/api/integrations/email/accounts')
        .then((res) => res.json())
        .then((data) => {
          setAvailableSenders(data.accounts || []);
          if (data.accounts && data.accounts.length > 0) {
            setSenderEmail(data.accounts[0].email);
          }
        })
        .catch(console.error);
    }
  }, [open]);

  // Load template
  React.useEffect(() => {
    if (selectedTemplate) {
      // In a real implementation, you would load the template and populate variables
      // For now, we'll just set a placeholder
      const template = emailTemplates[selectedTemplate as keyof typeof emailTemplates];
      if (template) {
        setSubject(template.subject);
        // In production, you would render the template with actual variables
      }
    }
  }, [selectedTemplate]);

  const handleSend = async () => {
    if (!to || !subject || !body || !senderEmail) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      const sendData: {
        to: string;
        subject: string;
        body: string;
        senderEmail: string;
        clientId?: string;
        scheduleDate?: string;
        scheduleTime?: string;
        attachments?: File[];
      } = {
        to,
        subject,
        body,
        senderEmail,
      };

      if (clientId) {
        sendData.clientId = clientId;
      }

      if (scheduleDate && scheduleTime) {
        sendData.scheduleDate = scheduleDate;
        sendData.scheduleTime = scheduleTime;
      }

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      toast({
        title: 'Success',
        description: scheduleDate && scheduleTime ? 'Email scheduled successfully' : 'Email sent successfully',
      });

      // Reset form
      setTo('');
      setSubject('');
      setBody('');
      setSelectedTemplate('');
      setAttachments([]);
      setScheduleDate('');
      setScheduleTime('');

      onSend?.();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>Send an email to your client</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sender Selection */}
          {availableSenders.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="sender">From</Label>
              <Select value={senderEmail} onValueChange={setSenderEmail}>
                <SelectTrigger id="sender">
                  <SelectValue placeholder="Select sender email" />
                </SelectTrigger>
                <SelectContent>
                  {availableSenders.map((sender) => (
                    <SelectItem key={sender.email} value={sender.email}>
                      {sender.email} ({sender.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Template (Optional)</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {Object.entries(emailTemplates).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To */}
          <div className="space-y-2">
            <Label htmlFor="to">To *</Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              required
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              required
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email message..."
              rows={10}
              required
            />
            <p className="text-xs text-muted-foreground">
              Note: Rich text editor coming soon. For now, use plain text or HTML.
            </p>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                multiple
                onChange={handleAttachment}
                className="hidden"
                id="attachment-input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('attachment-input')?.click()}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Add Attachment
              </Button>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Send */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Label>Schedule Send (Optional)</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : scheduleDate && scheduleTime ? (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
