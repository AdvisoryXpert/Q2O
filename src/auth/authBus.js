// src/auth/authBus.js

let authData = null;
const subscribers = new Set();

export function setAuthFromLogin(data) {
  console.log('[authBus] setAuthFromLogin:', data);
  authData = {
    id: data.user_id,
    mobile: data.mobile,
    role: data.userRole,
    name: data.userName,
  };
  subscribers.forEach(callback => callback(authData));
}

export function getAuthLite() {
  return authData;
}

export function subscribeAuth(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback); // Unsubscribe function
}

export function clearAuth() {
    authData = null;
    subscribers.forEach(callback => callback(null));
}
