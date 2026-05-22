import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDashboardTasks } from '@/lib/services/dashboardTasks';

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tasks = await getDashboardTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching dashboard tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard tasks' }, { status: 500 });
  }
}
