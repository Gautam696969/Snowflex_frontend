// Web Push Notification & Background Action Handler for Snowflex PWA
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = {}
  try {
    payload = event.data.json()
  } catch (e) {
    payload = {
      title: 'Snowflex Notification',
      body: event.data.text(),
    }
  }

  const title = payload.title || 'Snowflex Attendance Alert'
  const options = {
    body: payload.body || payload.message || 'New update in Snowflex.',
    icon: payload.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || payload.link || '/dashboard?view=attendance',
      dateOfArrival: Date.now(),
      primaryKey: payload.relatedId || 1,
    },
    actions: [
      {
        action: 'open',
        title: 'View Details',
      },
      {
        action: 'close',
        title: 'Dismiss',
      },
    ],
    tag: payload.type || 'snowflex-alert',
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (let client of windowClients) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

