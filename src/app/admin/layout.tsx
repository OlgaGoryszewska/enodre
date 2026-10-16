export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-theme min-h-screen bg-admin-background">{children}</div>;
}
