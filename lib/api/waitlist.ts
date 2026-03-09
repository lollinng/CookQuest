const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api/v1';

export async function signupForWaitlist(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/waitlist/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Signup failed');
  return data.data || data;
}
