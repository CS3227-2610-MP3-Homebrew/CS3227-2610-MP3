import { RoleGate } from "subject-role-gate";
import { ProtectedContent } from "../../protected-content";

export default function Page() {
  return <main><p>Public shell</p><RoleGate role="admin" unauthenticatedRedirectTo="/signed-out" fallback={<p role="status">Checking session</p>}><ProtectedContent role="admin" /></RoleGate></main>;
}
