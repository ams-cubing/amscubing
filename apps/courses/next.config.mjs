/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ["@workspace/auth", "@workspace/db", "@workspace/ui"],
  outputFileTracingIncludes: {
    "/cursos/*/certificado": [
      "./public/fonts/*.ttf",
      "./public/source/imagotipo-sm.png",
    ],
  },
};
