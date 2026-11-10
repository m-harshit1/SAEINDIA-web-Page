import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stepCandidates = [
    path.join(process.cwd(), 'BAJA_FULL_ASSEMBB;Y.STEP'),
    path.join(process.cwd(), 'BAJA_FULL_ASSEMBLY.STEP'),
    path.join(process.cwd(), 'baja_assembled.step')
  ];

  let filePath = '';
  for (const candidate of stepCandidates) {
    if (fs.existsSync(candidate)) {
      filePath = candidate;
      break;
    }
  }

  if (!filePath) {
    return NextResponse.json({ error: 'CAD STEP model file not found on server' }, { status: 404 });
  }

  try {
    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);
    
    // Transform Node.js ReadStream to Web ReadableStream
    const readable = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'application/step',
        'Content-Disposition': 'attachment; filename="BAJA_B26_FULL_ASSEMBLY.STEP"',
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err) {
    console.error('Error streaming STEP CAD model:', err);
    return NextResponse.json({ error: 'Failed to stream CAD model' }, { status: 500 });
  }
}

