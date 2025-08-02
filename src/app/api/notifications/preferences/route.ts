import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireAuth()
    
    const preference = await prisma.notificationPreference.findUnique({
      where: { userId: user.id }
    })

    return NextResponse.json({
      emailEnabled: preference?.emailEnabled ?? true
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth()
    const { emailEnabled } = await request.json()

    const preference = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        emailEnabled
      },
      update: { emailEnabled }
    })

    return NextResponse.json(preference)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}