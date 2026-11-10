import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const dbPath = path.join(process.cwd(), 'data', 'posts.json');

// Read posts helper
function readPosts() {
  try {
    if (!fs.existsSync(dbPath)) {
      return [];
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading posts database:', error);
    return [];
  }
}

// Write posts helper
function writePosts(posts: any[]) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing posts database:', error);
  }
}

export async function GET() {
  const posts = readPosts();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required to publish bulletins.' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'Post title is required' }, { status: 400 });
    }
    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 });
    }

    const posts = readPosts();
    const formattedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const newPost = {
      id: posts.length > 0 ? Math.max(...posts.map((p: any) => p.id)) + 1 : 1,
      title: body.title.trim().slice(0, 200),
      excerpt: (body.excerpt || body.content.slice(0, 140) + '...').toString().trim().slice(0, 300),
      content: body.content.trim().slice(0, 20000),
      category: ['Announcements', 'Testing', 'AWIM Outreach', 'Competitions'].includes(body.category) 
        ? body.category 
        : 'Announcements',
      author: session.user?.name || 'Harshit Kumar Mishra (President / Administrator)',
      date: formattedDate,
      lastUpdated: formattedDate,
      readTime: body.readTime || '3 min read'
    };

    posts.unshift(newPost); // Add to beginning
    writePosts(posts);

    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    console.error('Error handling posts POST:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
