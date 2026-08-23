import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'carwithdriver_token';
const REFRESH_TOKEN_KEY = 'carwithdriver_refresh_token';

export const saveToken = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token);

export const loadToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const deleteToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

export const saveRefreshToken = (token: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);

export const loadRefreshToken = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const deleteRefreshToken = () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
