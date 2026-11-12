// Muestra un aviso del sistema si el usuario lo ha permitido.
// Con la app instalada se usa el service worker, que también funciona con la pestaña en segundo plano.
export async function notifyUser(title: string, body: string, tag: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const options = { body, tag, icon: '/pwa-192x192.png' }
  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration) await registration.showNotification(title, options)
  else new Notification(title, options)
}
