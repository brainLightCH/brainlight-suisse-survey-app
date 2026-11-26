import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The team guide is a self-contained static page (public/coach-guide.html,
  // QR codes and images inlined), served under the coach space.
  async rewrites() {
    return [{ source: "/coach/guide", destination: "/coach-guide.html" }];
  },
};

export default nextConfig;
