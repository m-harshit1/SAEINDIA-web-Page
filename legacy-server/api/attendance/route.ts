import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const attendance = await prisma.attendanceRecord.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(attendance);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 401 });
    }
    const { name, role } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Valid member name is required' }, { status: 400 });
    }
    const record = await prisma.attendanceRecord.create({
      data: {
        name: name.trim().slice(0, 100),
        hours: 0,
        role: (role || 'Member').toString().trim().slice(0, 50),
        status: "Present"
      }
    });
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create attendance record' }, { status: 500 });
  }
}
