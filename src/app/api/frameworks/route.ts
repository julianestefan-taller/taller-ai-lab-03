import { NextResponse } from 'next/server'
import { FRAMEWORKS } from '@/lib/frameworks'

export async function GET() {
  return NextResponse.json({ frameworks: FRAMEWORKS })
}
