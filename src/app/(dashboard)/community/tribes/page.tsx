import { redirect } from 'next/navigation'

export default function TribesPage() {
  redirect('/community?category=GENEALOGY')
}
