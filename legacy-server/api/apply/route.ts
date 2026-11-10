import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'applications.json');

function readApplications() {
  try {
    if (!fs.existsSync(dbPath)) {
      return [];
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading applications database:', error);
    return [];
  }
}

function writeApplications(applications: any[]) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(applications, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing applications database:', error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, 
      rollNumber, 
      email, 
      phone, 
      branch, 
      year, 
      domain, 
      secondaryDomain, 
      coverText 
    } = body;

    // Validate inputs
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    const applications = readApplications();
    const refCode = `BAJA-APP-2026-${String(applications.length + 1).padStart(4, '0')}`;
    
    const newApplication = {
      id: applications.length > 0 ? Math.max(...applications.map((a: any) => a.id)) + 1 : 1,
      referenceCode: refCode,
      name: name.trim(),
      rollNumber: rollNumber?.trim() || '',
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      branch: branch || 'Mechanical Engineering',
      year: year || '1st Year',
      domain: domain || 'Chassis & Spaceframe Structural Design',
      secondaryDomain: secondaryDomain || 'None',
      coverText: coverText || '',
      submittedAt: new Date().toISOString(),
      status: 'Application Under Review'
    };

    applications.push(newApplication);
    writeApplications(applications);

    return NextResponse.json({ 
      success: true, 
      message: 'Application registered successfully in SAEINDIA BAJA recruitment database.',
      application: newApplication 
    }, { status: 201 });
  } catch (error) {
    console.error('Error handling apply POST:', error);
    return NextResponse.json({ error: 'Failed to process application' }, { status: 500 });
  }
}
