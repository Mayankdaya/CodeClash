# CodeClash Vercel Deployment Instructions

This document provides step-by-step instructions for deploying the CodeClash project to Vercel.

## Prerequisites

1. Make sure you have a Vercel account. If not, sign up at [vercel.com](https://vercel.com)
2. Make sure you have the Firebase configuration set up in your `.env.local` file

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Check/Create Firebase Configuration

Ensure you have a `.env.local` file in the root directory with the following Firebase configuration variables filled in:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
```

## Step 3: Login to Vercel CLI

```bash
vercel login
```

Follow the prompts to login with your Vercel account.

## Step 4: Deploy to Vercel

For a preview deployment, run:

```bash
vercel
```

For a production deployment, run:

```bash
vercel --prod
```

When running these commands for the first time, the Vercel CLI will ask you several questions:
1. Set up and deploy: Yes
2. Link to existing project: Yes (if you've already created it on Vercel) or No (to create a new project)
3. Select scope: Choose your personal account or team
4. Link to existing directory: Select the current directory
5. Override settings: No (to use your vercel.json configuration)

## Step 5: Environment Variables

If prompted, you'll need to add your environment variables from `.env.local` to your Vercel project. You can do this:

1. Through the CLI when prompted
2. Through the Vercel dashboard:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your project
   - Go to Settings > Environment Variables
   - Add each variable from your `.env.local` file

## Step 6: Verify Deployment

After the deployment is complete, Vercel will provide you with a deployment URL. Visit this URL to verify that your deployment was successful.

Production deployments will also be available at your configured domain if you have one set up.

## Common Issues and Troubleshooting

### Missing Environment Variables
- Make sure all required Firebase variables are added to Vercel

### Build Errors
- Check the Vercel build logs for detailed error information
- Make sure all dependencies are correctly listed in package.json

### API Routes Not Working
- Check that your API routes are properly configured for serverless environments

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/solutions/nextjs)
- [Environment Variables in Vercel](https://vercel.com/docs/environment-variables) 