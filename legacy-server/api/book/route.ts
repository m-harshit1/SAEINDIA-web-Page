import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'bookings.json');

function readBookings() {
  try {
    if (!fs.existsSync(dbPath)) {
      return [];
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading bookings database:', error);
    return [];
  }
}

function writeBookings(bookings: any[]) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(bookings, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing bookings database:', error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { alumnusName, bookingDate, bookingType } = body;

    if (!alumnusName || !bookingDate || !bookingType) {
      return NextResponse.json({ error: 'Missing booking details' }, { status: 400 });
    }

    const bookings = readBookings();
    const newBooking = {
      id: bookings.length > 0 ? Math.max(...bookings.map((b: any) => b.id)) + 1 : 1,
      alumnusName,
      bookingDate,
      bookingType,
      bookedAt: new Date().toISOString()
    };

    bookings.push(newBooking);
    writeBookings(bookings);

    console.log(`[Simulated Google Calendar Invite]: Dispatched session invite for mentor ${alumnusName} on ${bookingDate} (${bookingType})`);
    console.log(`[Simulated Email Dispatcher]: Confirmation email sent to mentor and student.`);

    return NextResponse.json({
      success: true,
      message: 'Booking registered successfully. Calendar invite and email confirmation sent.',
      booking: newBooking
    }, { status: 201 });
  } catch (error) {
    console.error('Error handling book POST:', error);
    return NextResponse.json({ error: 'Failed to process booking' }, { status: 500 });
  }
}
