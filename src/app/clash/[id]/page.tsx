
import ClashClient from './clash-client';

export default function ClashPage({ params }: { params: { id:string } }) {
  return (
    <ClashClient id={params.id} />
  );
}
