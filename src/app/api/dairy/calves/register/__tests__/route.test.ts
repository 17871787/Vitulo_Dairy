import { POST } from '../route';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn((callback) => callback(prisma)),
    animal: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    calfPurchase: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    // Decimal Mock
    Decimal: jest.fn((val) => val),
  },
  Prisma: {
    Decimal: jest.fn((val) => val),
  },
}));

describe('POST /api/dairy/calves/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should register a new calf successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { role: 'DAIRY_SUPPLIER', farmId: 'farm-1' } 
    });

    // Mock transaction finding no existing animal and creating one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.animal.findUnique as jest.Mock).mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.animal.create as jest.Mock).mockResolvedValue({ id: 'new-animal-id' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.calfPurchase.findUnique as jest.Mock).mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.calfPurchase.create as jest.Mock).mockResolvedValue({ id: 'new-purchase-id' });

    const body = {
      tagNumber: 'UK123456789012',
      breed: 'ANGUS',
      sex: 'MALE',
      dateOfBirth: '2023-01-01',
      weight: '50',
    };

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    
    // Check that animal was created
    expect(prisma.animal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tagNumber: 'UK123456789012',
        breederFarmId: 'farm-1',
      })
    }));

    // Check that purchase was created
    expect(prisma.calfPurchase.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        animalId: 'new-animal-id',
        dairyFarmId: 'farm-1',
      })
    }));
  });

  it('should fail if missing fields', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { role: 'DAIRY_SUPPLIER', farmId: 'farm-1' } 
    });

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ tagNumber: 'UK1' }), // Missing others
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});