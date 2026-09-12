import type { Viewport } from 'next';

export const constructViewport = (): Viewport => {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5, // Allows accessibility zooming
    userScalable: true,
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#ffffff' },
      { media: '(prefers-color-scheme: dark)', color: '#09090b' },
    ],
  };
};

export const viewport = constructViewport();
