import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { NextResponse } from 'next/server';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Polyfill Request
if (typeof global.Request === 'undefined') {
  // @ts-ignore
  global.Request = class Request {
    url: string;
    method: string;
    headers: Headers;
    body: any;
    constructor(input: string | Request, init?: RequestInit | any) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = init?.body;
    }
    json() { return Promise.resolve(JSON.parse(this.body)); }
  };
}

// Polyfill Response and Ensure static methods like json exist
if (typeof global.Response === 'undefined') {
  // @ts-ignore
  global.Response = class Response {
    status: number;
    ok: boolean;
    body: any;
    constructor(body?: any, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status || 200;
      this.ok = this.status >= 200 && this.status < 300;
    }
    json() { return Promise.resolve(this.body ? JSON.parse(this.body) : {}); }
    
    static json(data: any, init?: ResponseInit) {
        return new Response(JSON.stringify(data), init);
    }
  };
} else {
    // If Response exists but missing json static method (Node environment vs Web API)
    if (!global.Response.json) {
        // @ts-ignore
        global.Response.json = (data: any, init?: ResponseInit) => {
            return new Response(JSON.stringify(data), init);
        }
    }
}

if (typeof global.Headers === 'undefined') {
  // @ts-ignore
  global.Headers = class Headers extends Map {
    constructor(init?: any) {
      super();
      if (init) {
        for (const key in init) {
          this.set(key, init[key]);
        }
      }
    }
  };
}

// Mock NextRequest to fix test errors
jest.mock('next/server', () => {
  const actualNextServer = jest.requireActual('next/server');
  return {
    ...actualNextServer,
    NextRequest: class MockNextRequest {
      url: string;
      method: string;
      body: any;
      headers: Headers;
      
      constructor(input: string | URL, init?: RequestInit) {
        this.url = input.toString();
        this.method = init?.method || 'GET';
        this.body = init?.body;
        this.headers = new Headers(init?.headers);
      }

      json() {
        if (typeof this.body === 'string') {
          return Promise.resolve(JSON.parse(this.body));
        }
        return Promise.resolve(this.body);
      }
    },
    // Mock NextResponse.json specifically if needed, though the global Response.json polyfill should cover it if Next uses standard Response
    NextResponse: {
        ...actualNextServer.NextResponse,
        json: (body: any, init?: ResponseInit) => {
            return new Response(JSON.stringify(body), {
                ...init,
                headers: {
                    ...init?.headers,
                    'content-type': 'application/json',
                },
            });
        }
    }
  };
});