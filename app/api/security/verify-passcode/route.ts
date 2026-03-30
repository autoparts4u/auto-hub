import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { pin } = body

    if (typeof pin !== 'string' || pin.length !== 4) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const [settings, user] = await Promise.all([
      prisma.appSettings.findUnique({
        where: { id: 1 },
        select: { pinCode: true, duressPin: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { failedPinAttempts: true },
      }),
    ])

    if (!settings || !user) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }

    if (pin === settings.pinCode) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { failedPinAttempts: 0 },
      })
      return NextResponse.json({ success: true })
    }

    if (pin === settings.duressPin) {
      await prisma.appSettings.update({
        where: { id: 1 },
        data: { dbAccessEnabled: false },
      })
      return NextResponse.json({ success: false, type: 'locked' })
    }

    const newCount = user.failedPinAttempts + 1

    if (newCount >= 3) {
      await Promise.all([
        prisma.user.update({
          where: { id: session.user.id },
          data: { failedPinAttempts: newCount },
        }),
        prisma.appSettings.update({
          where: { id: 1 },
          data: { dbAccessEnabled: false },
        }),
      ])
      return NextResponse.json({ success: false, type: 'locked' })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { failedPinAttempts: newCount },
    })

    return NextResponse.json({
      success: false,
      type: 'invalid',
      attemptsLeft: 3 - newCount,
    })
  } catch (error) {
    console.error('Error verifying passcode:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
