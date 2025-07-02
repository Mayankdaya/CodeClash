
'use client';

import { useEffect, useState } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

export function OnlineCount() {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!rtdb) return;

    const statusRef = ref(rtdb, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const statuses = snapshot.val();
        const onlineUsers = Object.values(statuses).filter((status: any) => status.isOnline);
        setOnlineCount(onlineUsers.length);
      } else {
        setOnlineCount(0);
      }
    }, {
      // Handle permission denied errors gracefully
      onlyOnce: false
    });

    return () => unsubscribe();
  }, []);

  if (onlineCount === 0) {
    return null; // Don't render anything if count is 0 or loading
  }

  return (
    <div className="mt-8 flex justify-center items-center gap-3 text-sm font-medium text-accent">
        <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
        </div>
        <span>
            {onlineCount} {onlineCount === 1 ? 'developer' : 'developers'} online now
        </span>
    </div>
  );
}
