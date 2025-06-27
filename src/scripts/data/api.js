import { BASE_URL } from '../config';
import { getAccessToken } from '../utils/auth';

const ENDPOINTS = {
  ENDPOINT: `${BASE_URL}/your/endpoint/here`,
  REPORT_LIST: `${BASE_URL}/stories`,
  ADD_REPORT: `${BASE_URL}/stories`,
  LOGIN: `${BASE_URL}/login`,
  REGISTER: `${BASE_URL}/register`,
  DETAIL_STORY: id => `${BASE_URL}/stories/${id}`,
  SUBSCRIBE: `${BASE_URL}/notifications/subscribe`,
  UNSUBSCRIBE: `${BASE_URL}/notifications/subscribe`,
};

export async function getData() {
  const fetchResponse = await fetch(ENDPOINTS.ENDPOINT);
  return await fetchResponse.json();
}

export async function getAllReports() {
  const accessToken = getAccessToken();

  try {
    const fetchResponse = await fetch(ENDPOINTS.REPORT_LIST, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const json = await fetchResponse.json();
    console.log('API Response:', json);

    if (!fetchResponse.ok) {
      console.error('API Error:', json);
      return {
        ok: false,
        message: json.message || 'Failed to fetch stories',
      };
    }

    return {
      ...json,
      ok: true,
      listStory: json.listStory || [],
    };
  } catch (error) {
    console.error('Fetch Error:', error);
    return {
      ok: false,
      message: error.message || 'Failed to fetch stories',
    };
  }
}

export async function getStoryById(id) {
  const accessToken = getAccessToken();

  const fetchResponse = await fetch(ENDPOINTS.DETAIL_STORY(id), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}

export async function TambahData({ description, photo, lat, lon }) {
  const accessToken = getAccessToken();
  const formData = new FormData();
  formData.set('description', description);
  formData.set('lat', lat);
  formData.set('lon', lon);
  formData.append('photo', photo);

  const fetchResponse = await fetch(ENDPOINTS.ADD_REPORT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}

export async function getLogin({ email, password }) {
  const data = JSON.stringify({ email, password });

  const fetchResponse = await fetch(ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}

export async function getRegistered({ name, email, password }) {
  const data = JSON.stringify({ name, email, password });

  const fetchResponse = await fetch(ENDPOINTS.REGISTER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}

export async function subscribePushNotification({
  endpoint,
  keys: { p256dh, auth },
}) {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      console.error(
        'No access token found. User must be logged in to subscribe to notifications.'
      );
      return {
        ok: false,
        message: 'User must be logged in to subscribe to notifications',
      };
    }

    const data = JSON.stringify({
      endpoint,
      keys: { p256dh, auth },
    });

    console.log('Sending subscription request to:', ENDPOINTS.SUBSCRIBE);
    const fetchResponse = await fetch(ENDPOINTS.SUBSCRIBE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: data,
    });

    if (!fetchResponse.ok) {
      console.error(
        'Server responded with error:',
        fetchResponse.status,
        fetchResponse.statusText
      );
      const errorText = await fetchResponse.text();
      console.error('Error details:', errorText);
    }

    const json = await fetchResponse.json();
    console.log('Server response:', json);

    return {
      ...json,
      ok: fetchResponse.ok,
    };
  } catch (error) {
    console.error('Error in subscribePushNotification:', error);
    return {
      ok: false,
      message: error.message || 'Failed to subscribe to push notifications',
    };
  }
}

export async function unsubscribePushNotification({ endpoint }) {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      console.error(
        'No access token found. User must be logged in to unsubscribe from notifications.'
      );
      return {
        ok: false,
        message: 'User must be logged in to unsubscribe from notifications',
      };
    }

    const data = JSON.stringify({ endpoint });

    console.log('Sending unsubscribe request to:', ENDPOINTS.UNSUBSCRIBE);
    const fetchResponse = await fetch(ENDPOINTS.UNSUBSCRIBE, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      body: data,
    });

    if (!fetchResponse.ok) {
      console.error(
        'Server responded with error:',
        fetchResponse.status,
        fetchResponse.statusText
      );
      const errorText = await fetchResponse.text();
      console.error('Error details:', errorText);
      return {
        ok: false,
        message: errorText || 'Failed to unsubscribe from push notifications',
      };
    }

    const json = await fetchResponse.json();
    console.log('Server response:', json);

    return {
      ...json,
      ok: true,
    };
  } catch (error) {
    console.error('Error in unsubscribePushNotification:', error);
    return {
      ok: false,
      message: error.message || 'Failed to unsubscribe from push notifications',
    };
  }
}

export default {
  getData,
  getAllReports,
  getStoryById,
  TambahData,
  getLogin,
  getRegistered,
  subscribePushNotification,
  unsubscribePushNotification,
};
