import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";

// Конфигурация Firebase берется из переменных окружения
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Инициализируем Firebase
const app = initializeApp(firebaseConfig);

// Получаем экземпляр Auth
export const auth = getAuth(app);

// Создаем провайдеры для разных типов аутентификации
export const googleProvider = new GoogleAuthProvider();

// Функция для входа через Google с использованием всплывающего окна
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Ошибка при входе через Google:", error);
    throw error;
  }
};

// Функция для входа через Google с использованием редиректа
export const signInWithGoogleRedirect = async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error("Ошибка при перенаправлении на вход через Google:", error);
    throw error;
  }
};

// Функция для получения результата после редиректа
export const getGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user;
  } catch (error) {
    console.error("Ошибка при получении результата входа через Google:", error);
    throw error;
  }
};

// Функция для выхода из аккаунта
export const signOut = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Ошибка при выходе из системы:", error);
    throw error;
  }
};