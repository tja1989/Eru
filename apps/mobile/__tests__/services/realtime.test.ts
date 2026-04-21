/**
 * Realtime singleton tests. socket.io-client is mocked at the module level
 * so we never spin up a real socket — we assert on the wrapper's behavior.
 */

const mockSocket: any = {
  connected: false,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};
const mockIo: jest.Mock = jest.fn(() => mockSocket);

jest.mock('socket.io-client', () => ({
  io: (url: string, opts: unknown) => mockIo(url, opts),
}));

import { realtime } from '@/services/realtime';

describe('realtime singleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = false;
    realtime.disconnect();
  });

  it('connect(token) calls io() with /ws path and the token in handshake auth', async () => {
    await realtime.connect('fake-token-abc');
    expect(mockIo).toHaveBeenCalledTimes(1);
    const callArgs = mockIo.mock.calls[0] as unknown as [string, Record<string, unknown> & { auth: { token: string } }];
    const opts = callArgs[1];
    expect(opts.path).toBe('/ws');
    expect(opts.auth).toEqual({ token: 'fake-token-abc' });
    expect(opts.reconnection).toBe(true);
  });

  it('connect(""): is a no-op', async () => {
    await realtime.connect('');
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('on/off proxy through to the underlying socket', async () => {
    await realtime.connect('t');
    const handler = () => {};
    realtime.on('message:new', handler);
    realtime.off('message:new', handler);
    expect(mockSocket.on).toHaveBeenCalledWith('message:new', handler);
    expect(mockSocket.off).toHaveBeenCalledWith('message:new', handler);
  });

  it('emit proxies through with payload', async () => {
    await realtime.connect('t');
    realtime.emit('typing', { conversationId: 'c1' });
    expect(mockSocket.emit).toHaveBeenCalledWith('typing', { conversationId: 'c1' });
  });

  it('isConnected() reflects underlying socket state', async () => {
    expect(realtime.isConnected()).toBe(false);
    await realtime.connect('t');
    mockSocket.connected = true;
    expect(realtime.isConnected()).toBe(true);
  });

  it('disconnect() calls socket.disconnect and isConnected becomes false', async () => {
    await realtime.connect('t');
    mockSocket.connected = true;
    realtime.disconnect();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(realtime.isConnected()).toBe(false);
  });
});
