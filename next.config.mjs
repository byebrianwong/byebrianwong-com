/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Winter Village lived at /winter before it became the home page.
  // Browsers carry the #/card/... part of an old link across the redirect.
  async redirects() {
    return [{ source: "/winter", destination: "/", permanent: false }];
  },
};

export default nextConfig;
