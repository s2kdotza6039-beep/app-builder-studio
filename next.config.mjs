/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Turbopack's on-disk cache corrupted itself and hard-panicked:
    //   "range start index 94232 out of range for slice of length 94172"
    //   "Failed to restore task data (corrupted database or bug)"
    // This is a known Next.js 16 bug. Disabling the persistent dev cache stops
    // it recurring. Cost: slightly slower cold starts. Benefit: no more crashes.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
