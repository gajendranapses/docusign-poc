import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authCookie = request.cookies.get('docusign-poc-auth');
    
    if (!authCookie) {
      return NextResponse.json({ user: null });
    }

    const user = JSON.parse(authCookie.value);
    
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}