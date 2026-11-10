import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Member or Admin authentication required.' }, { status: 401 });
    }
    const { title, assignee, priority } = await req.json();
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Valid title is required' }, { status: 400 });
    }
    const task = await prisma.task.create({
      data: {
        title: title.trim().slice(0, 200),
        assignee: (assignee || 'Unassigned').toString().trim().slice(0, 100),
        priority: ['High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium',
        status: "Todo"
      }
    });
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
