import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, differenceInDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | any | null | undefined): string {
  if (amount === null || amount === undefined) return '£0.00';
  // Handle Prisma Decimal type
  const value = (amount && typeof amount === 'object' && 'toNumber' in amount)
    ? amount.toNumber()
    : (typeof amount === 'string' ? parseFloat(amount) : amount);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(value);
}

export function formatWeight(weight: number | string | any | null | undefined): string {
  if (weight === null || weight === undefined) return 'N/A';
  // Handle Prisma Decimal type
  const value = (weight && typeof weight === 'object' && 'toNumber' in weight)
    ? weight.toNumber()
    : (typeof weight === 'string' ? parseFloat(weight) : weight);
  return `${value.toFixed(1)}kg`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy');
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm');
}

export function getPaymentStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'OVERDUE':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getAnimalStatusColor(status: string): string {
  switch (status) {
    case 'ALIVE':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'SLAUGHTERED':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'SOLD':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'DEAD':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getDaysOverdue(paymentDate: Date | string | null, status: string | null): number | null {
  if (status !== 'PENDING' || !paymentDate) return null;
  const date = typeof paymentDate === 'string' ? parseISO(paymentDate) : paymentDate;
  const days = differenceInDays(new Date(), date);
  return days > 30 ? days - 30 : 0; // Assuming 30 days payment terms
}

export function formatBreed(breed: string): string {
  const breedMap: Record<string, string> = {
    ANGUS: 'Angus',
    HEREFORD: 'Hereford',
    SIMMENTAL: 'Simmental',
    CHAROLAIS: 'Charolais',
    LIMOUSIN: 'Limousin',
    ABERDEEN_ANGUS: 'Aberdeen Angus',
    AAX: 'Aberdeen Angus X',
    BBX: 'British Blue X',
    HEX: 'Hereford X',
    OTHER: 'Other',
  };
  return breedMap[breed] || breed;
}

export function formatSex(sex: string): string {
  const sexMap: Record<string, string> = {
    MALE: 'Male',
    FEMALE: 'Female',
    CASTRATED: 'Steer',
  };
  return sexMap[sex] || sex;
}
