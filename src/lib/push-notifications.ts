import { apiBase } from './api-config'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function isPushNotificationSupported(): Promise<boolean> {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function getPushSubscriptionState(): Promise<NotificationPermission | 'unsupported'> {
  if (!(await isPushNotificationSupported())) return 'unsupported'
  return Notification.permission
}

export async function subscribeToPushNotifications(token: string): Promise<boolean> {
  if (!(await isPushNotificationSupported())) {
    console.warn('Push notifications are not supported by this browser/device.')
    return false
  }

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.info('Notification permission was not granted:', permission)
      return false
    }

    // 2. Fetch VAPID public key from backend
    const keyRes = await fetch(`${apiBase}/push/public-key`)
    const keyData = await keyRes.json()
    const publicKey = keyData.data?.publicKey
    if (!publicKey) throw new Error('VAPID public key not found on server')

    // 3. Wait for service worker registration
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(publicKey)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      })
    }

    // 4. Save subscription on backend
    const subJson = subscription.toJSON()
    const saveRes = await fetch(`${apiBase}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription: subJson }),
    })

    return saveRes.ok
  } catch (err) {
    console.error('Failed to subscribe to push notifications:', err)
    return false
  }
}

export async function unsubscribeFromPushNotifications(token: string): Promise<boolean> {
  if (!(await isPushNotificationSupported())) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return true

    const endpoint = subscription.endpoint
    await subscription.unsubscribe()

    await fetch(`${apiBase}/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {})

    return true
  } catch (err) {
    console.error('Failed to unsubscribe from push notifications:', err)
    return false
  }
}
