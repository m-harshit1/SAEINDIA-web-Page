import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 401 });
    }
    const { id } = await params;
    await prisma.inventoryItem.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}
