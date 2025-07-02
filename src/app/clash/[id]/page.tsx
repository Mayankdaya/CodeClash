
import ClashClient from './clash-client';
import AuthGuard from '@/components/AuthGuard';

export default function ClashPage({ params }: { params: { id:string } }) {
  return (
    <AuthGuard>
      <ClashClient id={params.id} />
    </AuthGuard>
  );
}
