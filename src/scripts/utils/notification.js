import { convertBase64ToUint8Array } from './index';
import { VAPID_PUBLIC_KEY } from '../config';
import {
  subscribePushNotification,
  unsubscribePushNotification,
} from '../data/api';

export function isNotificationAvailable() {
  return 'Notification' in window;
}

export function isNotificationGranted() {
  return Notification.permission === 'granted';
}

export async function requestNotificationPermission() {
  if (!isNotificationAvailable()) {
    console.error('Notification API unsupported.');
    return false;
  }

  if (isNotificationGranted()) {
    return true;
  }

  const status = await Notification.requestPermission();

  if (status === 'denied') {
    alert('Notification permission denied');
    return false;
  }

  if (status === 'default') {
    alert('Notification permission is closed or ignored');
    return false;
  }

  return true;
}

export async function getPushSubscription() {
  try {
    const registration = await ensureServiceWorkerRegistration();
    if (!registration) {
      console.error('Service Worker registration not found');
      return null;
    }
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
}

export async function isCurrentPushSubscriptionAvailable() {
  return !!(await getPushSubscription());
}

export function generateSubscribeOptions() {
  return {
    userVisibleOnly: true,
    applicationServerKey: convertBase64ToUint8Array(VAPID_PUBLIC_KEY),
  };
}

export async function ensureServiceWorkerRegistration() {
  try {
    let registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      console.log('Service Worker not registered, registering now...');
      registration = await navigator.serviceWorker.register('./sw.bundle.js');
      console.log(
        'Service Worker registered successfully:',
        registration.scope
      );
    }

    return registration;
  } catch (error) {
    console.error('Error ensuring Service Worker registration:', error);
    throw error;
  }
}

export async function subscribe() {
  if (!(await requestNotificationPermission())) {
    return;
  }

  if (await isCurrentPushSubscriptionAvailable()) {
    alert('Already subscribed to push notifications');
    return;
  }

  const failureSubscribeMessage = 'Failed to subscribe to push notifications.';
  const successSubscribeMessage = 'Subscribed to push notifications.';

  let pushSubscription = null;

  try {
    const registration = await ensureServiceWorkerRegistration();
    if (!registration) {
      throw new Error('Service Worker registration not found');
    }

    const subscribeOptions = generateSubscribeOptions();

    if (!registration.pushManager) {
      throw new Error('Push manager not supported');
    }

    pushSubscription =
      await registration.pushManager.subscribe(subscribeOptions);
    if (!pushSubscription) {
      throw new Error('Failed to create push subscription');
    }

    const { endpoint, keys } = pushSubscription.toJSON();

    const response = await subscribePushNotification({ endpoint, keys });

    if (!response.ok) {
      alert(failureSubscribeMessage);

      if (pushSubscription) {
        await pushSubscription.unsubscribe();
      }

      return;
    }

    alert(successSubscribeMessage);
  } catch (error) {
    let errorMessage = failureSubscribeMessage;

    if (error.name === 'NotAllowedError') {
      errorMessage =
        'Notification permission denied. Please enable notifications in your browser settings.';
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'Push notifications are not supported by your browser.';
    } else if (error.name === 'AbortError') {
      errorMessage = 'Push notification subscription was aborted.';
    }

    alert(errorMessage);

    if (pushSubscription) {
      try {
        await pushSubscription.unsubscribe();
      } catch (unsubscribeError) {
        // Silent fail on cleanup
      }
    }
  }
}

export async function unsubscribe() {
  const failureUnsubscribeMessage =
    'Failed to unsubscribe from push notifications.';
  const successUnsubscribeMessage =
    'Successfully unsubscribed from push notifications.';

  try {
    const registration = await ensureServiceWorkerRegistration();
    if (!registration) {
      throw new Error('Service Worker registration not found');
    }

    const pushSubscription = await registration.pushManager.getSubscription();
    if (!pushSubscription) {
      alert(
        'Cannot unsubscribe from push notifications because you have not subscribed before.'
      );
      return false;
    }

    const { endpoint, keys } = pushSubscription.toJSON();

    const response = await unsubscribePushNotification({ endpoint });
    if (!response.ok) {
      console.error('Server unsubscribe response:', response);
      throw new Error('Server unsubscribe failed');
    }

    const unsubscribed = await pushSubscription.unsubscribe();
    if (!unsubscribed) {
      throw new Error('Local unsubscribe failed');
    }

    alert(successUnsubscribeMessage);
    return true;
  } catch (error) {
    console.error('Unsubscribe error:', error);
    alert(failureUnsubscribeMessage);
    return false;
  }
}

export async function initNotificationButton() {
  const pushNotificationTools = document.getElementById(
    'push-notification-tools'
  );

  if (!pushNotificationTools) {
    console.error('Push notification tools element not found');
    return;
  }

  const updateButtonState = async () => {
    const isSubscribed = await isCurrentPushSubscriptionAvailable();
    const button = pushNotificationTools.querySelector('.notification-button');

    if (button) {
      button.className = `notification-button ${isSubscribed ? 'subscribed' : ''}`;
      button.innerHTML = `
        <i class="fas ${isSubscribed ? 'fa-bell' : 'fa-bell-slash'}"></i>
        ${isSubscribed ? 'Nonactivate Notification' : 'Activate Notification'}
      `;
    }
  };

  const button = document.createElement('button');
  button.className = 'notification-button';
  button.innerHTML = `
    <i class="fas fa-bell-slash"></i>
    Activate Notification
  `;

  button.addEventListener('click', async () => {
    const isSubscribed = await isCurrentPushSubscriptionAvailable();

    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        await updateButtonState();
      }
    } else {
      await subscribe();
      await updateButtonState();
    }
  });

  pushNotificationTools.appendChild(button);
  await updateButtonState();
}
