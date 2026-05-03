export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/obras/:path*",
    "/insights/:path*",
    "/equipe/:path*",
    "/api/((?!auth).*)", // Protege todas as APIs exceto auth
  ],
};
