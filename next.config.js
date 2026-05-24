/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ['googleapis', '@notionhq/client', 'unpdf'],
};
module.exports = nextConfig;
