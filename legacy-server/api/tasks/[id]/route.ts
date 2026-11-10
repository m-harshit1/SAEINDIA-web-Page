import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Member or Admin authentication required.' }, { status: 401 });
    }
    const { id } = await params;
    const { status } = await req.json();
    if (!['Todo', 'In-Progress', 'Done'].includes(status)) {
      return NextResponse.json({ error: 'Invalid task status' }, { status: 400 });
    }
    const task = await prisma.task.update({
      where: { id },
      data: { status }
    });
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden. Only Admins can delete tasks.' }, { status: 403 });
    }
    const { id } = await params;
    await prisma.task.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
