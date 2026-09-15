import type { Metadata } from 'next';

const APP_DEFAULT_TITLE = 'ticktock';
const APP_TITLE_TEMPLATE = '%s | ticktock';
const APP_DESCRIPTION =
  'ticktock — multi-tenant weekly timesheet tracker built with the Next.js App Router.';
const rawAppUrl =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
const APP_URL = rawAppUrl.startsWith('http') ? rawAppUrl : `https://${rawAppUrl}`;

interface ConstructMetadataParams {
  title?: string;
  description?: string;
  image?: string;
  icons?: string;
  noIndex?: boolean;
}

export function constructMetadata({
  title = APP_DEFAULT_TITLE,
  description = APP_DESCRIPTION,
  image = '/og-image.png',
  icons = '/favicon.ico',
  noIndex = false,
}: ConstructMetadataParams = {}): Metadata {
  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: title,
      template: APP_TITLE_TEMPLATE,
    },
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    icons,
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
