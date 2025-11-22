import { GET } from '../route';
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
    killRecord: {
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/dairy/performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate performance metrics', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { role: 'DAIRY_SUPPLIER', farmId: 'farm-1' } 
    });

    const mockKills = [
      {
        id: 'k1',
        killDate: new Date('2023-01-01'),
        totalWeight: 300,
        value: 1200,
        conformation: 'R',
        fatClass: '3',
        animal: { breed: 'ANGUS' }
      },
      {
        id: 'k2',
        killDate: new Date('2023-01-02'),
        totalWeight: 320,
        value: 1300,
        conformation: 'U',
        fatClass: '3',
        animal: { breed: 'ANGUS' }
      }
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.killRecord.findMany as jest.Mock).mockResolvedValue(mockKills as any);

    const req = new NextRequest('http://localhost/api/dairy/performance');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.metrics.totalSlaughtered).toBe(2);
    expect(json.metrics.averageDeadweight).toBe(310); // (300+320)/2
    expect(json.metrics.averageCarcassValue).toBe(1250); // (1200+1300)/2
    expect(json.metrics.gradeDistribution['R3']).toBe(1);
    expect(json.metrics.gradeDistribution['U3']).toBe(1);
  });
});
