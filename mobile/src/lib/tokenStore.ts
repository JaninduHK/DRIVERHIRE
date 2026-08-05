import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'carwithdriver_token';

export const saveToken = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token);

export const loadToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const deleteToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);
