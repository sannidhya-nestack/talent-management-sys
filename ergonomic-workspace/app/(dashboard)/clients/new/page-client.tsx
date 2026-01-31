'use client';

/**
 * New Client Page Client Component
 *
 * Form to create a new client with validation and submission.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
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
import { strings } from '@/config';
import { ClientStatus, BudgetRange } from '@/lib/types/firestore';

export function NewClientPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    status: ClientStatus.ACTIVE,
    initialScope: '',
    budgetRange: '' as BudgetRange | '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    website: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create client');
      }

      const { client } = await response.json();

      toast({
        title: 'Success',
        description: `Client "${client.companyName}" created successfully`,
      });

      router.push(`/clients/${client.id}`);
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create client',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{strings.clients.createClient}</h1>
        <p className="text-muted-foreground">
          Add a new client to your workspace
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>Enter the basic information for the new client</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">
                  {strings.clients.companyName} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  placeholder="Acme Corporation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">{strings.clients.industry}</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Technology"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{strings.clients.status}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as ClientStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ClientStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={ClientStatus.PROSPECT}>Prospect</SelectItem>
                    <SelectItem value={ClientStatus.INACTIVE}>Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetRange">Budget Range</Label>
                <Select
                  value={formData.budgetRange}
                  onValueChange={(value) => setFormData({ ...formData, budgetRange: value as BudgetRange })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BudgetRange.UNDER_10K}>Under $10,000</SelectItem>
                    <SelectItem value={BudgetRange.TEN_TO_50K}>$10,000 - $50,000</SelectItem>
                    <SelectItem value={BudgetRange.FIFTY_TO_100K}>$50,000 - $100,000</SelectItem>
                    <SelectItem value={BudgetRange.OVER_100K}>Over $100,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="New York"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="NY"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="10001"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="United States"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initialScope">Initial Project Scope</Label>
              <Textarea
                id="initialScope"
                value={formData.initialScope}
                onChange={(e) => setFormData({ ...formData, initialScope: e.target.value })}
                placeholder="Brief description of the project scope..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the client..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                {strings.actions.cancel}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : strings.actions.save}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
