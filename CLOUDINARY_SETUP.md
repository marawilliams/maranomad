# Cloudinary Setup for Image Uploads

To enable image uploads directly from the admin panel, you need to set up a Cloudinary account and configure the environment variables.

## 1. Create a Cloudinary Account

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Once logged in, go to your Dashboard

## 2. Get Your API Credentials

In your Cloudinary Dashboard, you'll find:
- **Cloud Name**: Your unique cloud name
- **API Key**: Your API key
- **API Secret**: Your API secret

## 3. Configure Environment Variables

Update your `backend/.env` file with your Cloudinary credentials:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

Replace the placeholder values with your actual Cloudinary credentials.

## 4. Restart the Backend Server

After updating the environment variables, restart your backend server:

```bash
cd backend
npm run dev
```

## 5. Test Image Upload

1. Go to your admin panel (`/admin`)
2. Try adding a new product
3. Use the "Upload Images" field to select image files
4. The images will be automatically uploaded to Cloudinary and the URLs will be added to the product

## Features

- **Multiple Image Upload**: Select multiple images at once
- **Automatic Optimization**: Images are automatically resized and optimized
- **Secure URLs**: All uploaded images use HTTPS URLs
- **Fallback Support**: You can still manually enter image URLs if needed

## Troubleshooting

- **Upload fails**: Check your Cloudinary credentials in `.env`
- **Images not showing**: Ensure your Cloudinary account has quota remaining
- **CORS errors**: The backend is configured to allow Cloudinary API calls