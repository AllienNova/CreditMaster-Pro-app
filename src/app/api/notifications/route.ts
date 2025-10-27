import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notifications/notification-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }
    
    const notifications = notificationService.getUserNotifications(userId, limit);
    const unreadCount = notificationService.getUnreadCount(userId);
    
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, message, data } = body;
    
    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const notification = notificationService.createNotification(
      userId,
      type,
      title,
      message,
      data
    );
    
    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notificationId, action } = body;
    
    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (action === 'mark_read' && notificationId) {
      const success = notificationService.markAsRead(userId, notificationId);
      return NextResponse.json({ success });
    } else if (action === 'mark_all_read') {
      const count = notificationService.markAllAsRead(userId);
      return NextResponse.json({ count });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const notificationId = searchParams.get('notificationId');
    
    if (!userId || !notificationId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    const success = notificationService.deleteNotification(userId, notificationId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}

