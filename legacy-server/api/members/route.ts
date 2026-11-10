import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const members = await prisma.member.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 401 });
    }
    const { name, role, department, email, yearJoined, membershipId } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Valid member name is required' }, { status: 400 });
    }
    const finalMembershipId = membershipId?.trim() 
      ? membershipId.trim().toUpperCase().slice(0, 30)
      : `SAEBAJA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const member = await prisma.member.create({
      data: {
        membershipId: finalMembershipId,
        name: name.trim().slice(0, 100),
        role: (role || 'Member').toString().trim().slice(0, 100),
        department: (department || 'BAJA Division').toString().trim().slice(0, 100),
        email: email || `${name.toLowerCase().replace(/\s+/g, '.')}-${Date.now()}@iiitk.ac.in`,
        yearJoined: parseInt(yearJoined) || new Date().getFullYear()
      }
    });
    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
}
