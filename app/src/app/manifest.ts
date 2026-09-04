import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Society Management System',
    short_name: 'SMS',
    description: 'A modern management system for residential societies',
    start_url: '/login',
    display: 'standalone',
    background_color: '#f8f9ff',
    theme_color: '#00236f',
    icons: [
      {
        src: '/icons/icon.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      }
    ],
  }
}
