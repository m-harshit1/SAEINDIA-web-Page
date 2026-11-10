import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const inventory = await prisma.inventoryItem.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(inventory);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 401 });
    }
    const { name, qty, dept } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Valid component name is required' }, { status: 400 });
    }
    const item = await prisma.inventoryItem.create({
      data: {
        name: name.trim().slice(0, 100),
        qty: (qty || '1 unit').toString().trim().slice(0, 50),
        dept: (dept || 'General').toString().trim().slice(0, 50),
        status: "In Stock"
      }
    });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 });
  }
}
