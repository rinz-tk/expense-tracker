export function auth_header(token) {
  const header = { 'Content-Type': 'application/json' };
  if(token != null) {
    header['Authorization'] = `Bearer ${token}`;
  }

  return header;
}
