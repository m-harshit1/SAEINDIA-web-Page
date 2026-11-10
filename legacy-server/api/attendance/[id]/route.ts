import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 401 });
    }
    const { id } = await params;
    const { status } = await req.json();
    if (!['Present', 'Absent'].includes(status)) {
      return NextResponse.json({ error: 'Invalid attendance status' }, { status: 400 });
    }
    const record = await prisma.attendanceRecord.update({
      where: { id },
      data: { status }
    });
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 401 });
    }
    const { id } = await params;
    await prisma.attendanceRecord.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete attendance record' }, { status: 500 });
  }
}
