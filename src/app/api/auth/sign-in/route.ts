import { handleAccountRequest } from "@/server/auth/account-adapter";

const handle = (request: Request) => handleAccountRequest("signIn", request);
export { handle as POST, handle as GET, handle as PUT, handle as PATCH, handle as DELETE, handle as HEAD, handle as OPTIONS };
