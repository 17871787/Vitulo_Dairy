'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const calfSchema = z.object({
  tagNumber: z.string().regex(/^UK\d{12}$/, 'Must be a valid UK tag (UK followed by 12 digits)'),
  breed: z.string().min(1, 'Breed is required'),
  sex: z.enum(['MALE', 'FEMALE']),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  weight: z.string().optional(),
  sireTag: z.string().optional(),
});

type CalfFormData = z.infer<typeof calfSchema>;

export default function RegisterCalfPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<CalfFormData>({
    resolver: zodResolver(calfSchema),
    defaultValues: {
      tagNumber: 'UK',
      sex: 'MALE',
    },
  });

  const onSubmit = async (data: CalfFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/dairy/calves/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register calf');
      }

      setSuccess(true);
      form.reset({
        tagNumber: 'UK',
        sex: 'MALE',
        breed: '',
        dateOfBirth: '',
        weight: '',
        sireTag: '',
      });
      
      // Refresh data after short delay
      setTimeout(() => {
        router.refresh();
      }, 1000);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Register Calf</h1>
          <p className="text-gray-600 mt-1">
            Add a new calf to your sales list
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/calves">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calf Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Calf registered successfully! You can add another.
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* Tag Number */}
              <div className="space-y-2">
                <Label htmlFor="tagNumber">Ear Tag Number</Label>
                <Input
                  id="tagNumber"
                  placeholder="UK123456789012"
                  {...form.register('tagNumber')}
                  className={form.formState.errors.tagNumber ? 'border-red-500' : ''}
                />
                {form.formState.errors.tagNumber && (
                  <p className="text-sm text-red-500">{form.formState.errors.tagNumber.message}</p>
                )}
              </div>

              {/* Breed */}
              <div className="space-y-2">
                <Label htmlFor="breed">Breed</Label>
                <Select 
                  onValueChange={(value) => form.setValue('breed', value)} 
                  defaultValue={form.getValues('breed')}
                >
                  <SelectTrigger className={form.formState.errors.breed ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select breed" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="British Blue">British Blue</SelectItem>
                    <SelectItem value="Aberdeen Angus">Aberdeen Angus</SelectItem>
                    <SelectItem value="Hereford">Hereford</SelectItem>
                    <SelectItem value="Limousin">Limousin</SelectItem>
                    <SelectItem value="Charolais">Charolais</SelectItem>
                    <SelectItem value="Simmental">Simmental</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.breed && (
                  <p className="text-sm text-red-500">{form.formState.errors.breed.message}</p>
                )}
              </div>

              {/* Sex */}
              <div className="space-y-2">
                <Label htmlFor="sex">Sex</Label>
                <div className="flex space-x-4 pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="MALE"
                      {...form.register('sex')}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span>Male</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="FEMALE"
                      {...form.register('sex')}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span>Female</span>
                  </label>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...form.register('dateOfBirth')}
                  className={form.formState.errors.dateOfBirth ? 'border-red-500' : ''}
                />
                {form.formState.errors.dateOfBirth && (
                  <p className="text-sm text-red-500">{form.formState.errors.dateOfBirth.message}</p>
                )}
              </div>

              {/* Weight (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg) - Optional</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="e.g. 55"
                  {...form.register('weight')}
                />
              </div>

              {/* Sire Tag (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="sireTag">Sire Tag - Optional</Label>
                <Input
                  id="sireTag"
                  placeholder="Sire Ear Tag"
                  {...form.register('sireTag')}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register Calf'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
