import ClashClient from './clash-client';

// This is a server component
export default function ClashPage({ params }: { params: { id:string } }) {
  // It receives params from Next.js and passes the id to the client component
  return <ClashClient id={params.id} />;
}
