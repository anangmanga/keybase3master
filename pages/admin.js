import AdminPanel from '../components/AdminPanel';
import Head from 'next/head';

export default function AdminPage() {
  return (
    <>
      <Head>
        <title>Admin Panel - KeyBase</title>
        <meta name="description" content="Admin panel for managing KeyBase marketplace" />
      </Head>
      <AdminPanel />
    </>
  );
}
