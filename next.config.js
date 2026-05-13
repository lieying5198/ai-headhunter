/** @type {import('next').NextConfig} */
const nextConfig = {
  // 确保路径别名正确工作
  webpack: (config, { isServer }) => {
    // 显式配置 @ 别名，确保指向 src 目录
    config.resolve.alias['@'] = require('path').resolve(__dirname, 'src');
    return config;
  },
};

module.exports = nextConfig;
