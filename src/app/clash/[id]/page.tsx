
import AuthGuard from '@/components/AuthGuard';
import ClashClient from './clash-client';

export default function ClashPage({ params }: { params: { id:string } }) {
  return (
    <AuthGuard>
      <ClashClient id={params.id} />
    </AuthGuard>
  );
}
